import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { applications } from "@/lib/api";

export function useApplicationExport() {
  const [exporting, setExporting] = useState(false);

  const exportApplications = async (exportParams: any, filename?: string) => {
    try {
      setExporting(true);
      
      // Call export API (assuming it exists in the API)
      // If export API doesn't exist, we'll fetch all data and convert to CSV
      let csvData: string;
      
      try {
        const response: any = await applications.export({ ...exportParams, format: 'csv' });
        if (typeof response === 'string') {
          // Server returned raw CSV text
          csvData = response;
        } else if (response?.success && typeof response.data === 'string') {
          csvData = response.data;
        } else {
          throw new Error(response?.message || "Export failed");
        }
      } catch (apiError) {
        // Fallback: Fetch data and convert to CSV manually
        console.log('Export API not available, fetching data manually...');
        const response = await applications.getAll({ ...exportParams, limit: 10000 });
        
        if (!response.success) {
          throw new Error(response.message || "Failed to fetch applications");
        }
        
        // Convert to CSV
        const apps = response.data.applications;
        if (apps.length === 0) {
          throw new Error("No applications to export");
        }
        
        // CSV headers
        const headers = [
          'Application Number',
          'Beneficiary Name',
          'Phone',
          'Scheme',
          'Project',
          'Status',
          'Requested Amount',
          'Approved Amount',
          'District',
          'Area',
          'Unit',
          'Applied Date',
          'Updated Date'
        ];
        
        // CSV rows
        const rows = apps.map((app: any) => [
          app.applicationNumber,
          app.beneficiary?.name || '',
          app.beneficiary?.phone || '',
          app.scheme?.name || '',
          app.project?.name || '',
          app.status,
          app.requestedAmount || 0,
          app.approvedAmount || 0,
          app.district?.name || '',
          app.area?.name || '',
          app.unit?.name || '',
          new Date(app.createdAt).toLocaleDateString(),
          new Date(app.updatedAt).toLocaleDateString()
        ]);
        
        // Combine headers and rows
        csvData = [
          headers.join(','),
          ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');
      }
      
      // Create download link
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename with timestamp and filters
      const timestamp = new Date().toISOString().split('T')[0];
      const statusPart = exportParams.status && exportParams.status !== 'all' ? `_${exportParams.status}` : '';
      const dateFilterPart = exportParams.quickDateFilter ? `_${exportParams.quickDateFilter}` : '';
      link.download = filename || `applications${statusPart}${dateFilterPart}_${timestamp}.csv`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export Successful",
        description: "Applications have been exported successfully.",
      });
    } catch (error) {
      console.error('Error exporting applications:', error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export applications",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  return { exportApplications, exporting };
}

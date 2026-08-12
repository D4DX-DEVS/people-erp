import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { payments } from "@/lib/api";

export function usePaymentExport() {
  const [exporting, setExporting] = useState(false);

  const exportPayments = async (exportParams: any, filename?: string) => {
    try {
      setExporting(true);
      
      // Call export API or fetch data and convert to CSV
      let csvData: string;
      
      try {
        const response: any = await payments.export({ ...exportParams, format: 'csv' });
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
        const response = await payments.getAll({ ...exportParams, limit: 10000 });
        
        if (!response.success) {
          throw new Error(response.message || "Failed to fetch payments");
        }
        
        // Convert to CSV
        const paymentList = response.data.payments;
        if (paymentList.length === 0) {
          throw new Error("No payments to export");
        }
        
        // CSV headers
        const headers = [
          'Payment Number',
          'Beneficiary Name',
          'Beneficiary ID',
          'Gender',
          'Scheme',
          'Project',
          'Phase',
          'Amount',
          'Percentage',
          'Status',
          'Payment Method',
          'Due Date',
          'Payment Date',
          'Cheque Number',
          'District',
          'Area',
          'Unit',
          'Source',
          'Approved By',
          'Approved At'
        ];
        
        // CSV rows
        const rows = paymentList.map((payment: any) => [
          payment.paymentNumber || '',
          payment.beneficiaryName || '',
          payment.beneficiaryId || '',
          payment.beneficiaryGender || '',
          payment.scheme || '',
          payment.project || '',
          payment.phase || '',
          payment.amount || 0,
          payment.percentage || 0,
          payment.status || '',
          payment.method || '',
          payment.dueDate ? new Date(payment.dueDate).toLocaleDateString() : '',
          payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : '',
          payment.chequeNumber || '',
          payment.district?.name || '',
          payment.area?.name || '',
          payment.unit?.name || '',
          payment.source || '',
          payment.approvedBy || '',
          payment.approvedAt ? new Date(payment.approvedAt).toLocaleDateString() : ''
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
      link.download = filename || `payments${statusPart}${dateFilterPart}_${timestamp}.csv`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export Successful",
        description: "Payments have been exported successfully.",
      });
    } catch (error) {
      console.error('Error exporting payments:', error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export payments",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  return { exportPayments, exporting };
}

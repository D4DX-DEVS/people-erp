import { useState, useCallback, useEffect } from "react";
import { QuickDateRange, getDateRangeFromQuickFilter } from "@/components/filters/QuickDateFilter";
import { projects, schemes, locations, applications, type ApplicationFilterField } from "@/lib/api";

export interface ApplicationFilterState {
  searchTerm: string;
  statusFilter: string;
  projectFilter: string;
  districtFilter: string;
  areaFilter: string;
  unitFilter: string;
  schemeFilter: string;
  genderFilter: string;
  /** Scheme-specific form-builder dropdown filters: field key -> selected option */
  formFilters: Record<string, string>;
  fromDate?: Date;
  toDate?: Date;
  quickDateFilter: QuickDateRange;
  currentPage: number;
}

export interface DropdownData {
  projectsList: any[];
  schemesList: any[];
  districts: any[];
  areas: any[];
  units: any[];
}

export function useApplicationFilters(defaultStatus?: string) {
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState(defaultStatus || "all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [districtFilter, setDistrictFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [unitFilter, setUnitFilter] = useState("all");
  const [schemeFilter, setSchemeFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [formFilters, setFormFilters] = useState<Record<string, string>>({});
  const [formFilterFields, setFormFilterFields] = useState<ApplicationFilterField[]>([]);
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [quickDateFilter, setQuickDateFilter] = useState<QuickDateRange>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Dropdown data
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [schemesList, setSchemesList] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);

  // Load dropdown data
  const loadDropdownData = useCallback(async () => {
    try {
      setLoadingDropdowns(true);
      console.log('🔄 [FILTERS] Loading dropdown data...');
      
      const [projectsResponse, schemesResponse, districtsResponse, areasResponse, unitsResponse] = await Promise.all([
        projects.getAll({ limit: 100 }),
        schemes.getAll({ limit: 100 }),
        locations.getByType('district', { active: true }),
        locations.getByType('area', { active: true }),
        locations.getByType('unit', { active: true })
      ]);

      console.log('📋 [FILTERS] Projects response:', { success: projectsResponse.success, count: projectsResponse.data?.projects?.length || 0 });
      console.log('📋 [FILTERS] Schemes response:', { success: schemesResponse.success, count: schemesResponse.data?.schemes?.length || 0 });
      console.log('📋 [FILTERS] Districts response:', { success: districtsResponse.success, count: districtsResponse.data?.locations?.length || 0 });
      console.log('📋 [FILTERS] Areas response:', { success: areasResponse.success, count: areasResponse.data?.locations?.length || 0 });
      console.log('📋 [FILTERS] Units response:', { success: unitsResponse.success, count: unitsResponse.data?.locations?.length || 0 });

      if (projectsResponse.success) {
        const projects = Array.isArray(projectsResponse.data.projects) ? projectsResponse.data.projects : [];
        setProjectsList(projects);
        console.log('✅ [FILTERS] Projects loaded:', projects.length);
      }
      
      if (schemesResponse.success) {
        const schemes = Array.isArray(schemesResponse.data.schemes) ? schemesResponse.data.schemes : [];
        setSchemesList(schemes);
        console.log('✅ [FILTERS] Schemes loaded:', schemes.length);
      }
      
      if (districtsResponse.success) {
        const districts = Array.isArray(districtsResponse.data.locations) ? districtsResponse.data.locations : [];
        setDistricts(districts);
        console.log('✅ [FILTERS] Districts loaded:', districts.length);
      }
      
      if (areasResponse.success) {
        const areas = Array.isArray(areasResponse.data.locations) ? areasResponse.data.locations : [];
        setAreas(areas);
        console.log('✅ [FILTERS] Areas loaded:', areas.length);
      }
      
      if (unitsResponse.success) {
        const units = Array.isArray(unitsResponse.data.locations) ? unitsResponse.data.locations : [];
        setUnits(units);
        console.log('✅ [FILTERS] Units loaded:', units.length);
      }
    } catch (error) {
      console.error('❌ [FILTERS] Error loading dropdown data:', error);
    } finally {
      setLoadingDropdowns(false);
      console.log('✅ [FILTERS] Dropdown data loading complete');
    }
  }, []);

  // Load dropdown data on mount
  useEffect(() => {
    loadDropdownData();
  }, [loadDropdownData]);

  // Scheme-specific filters: the form builder can mark dropdown fields as
  // filterable. Their keys are per form, so selections reset on scheme change.
  useEffect(() => {
    let cancelled = false;
    // Keep the same object when already empty so dependent effects don't refetch
    setFormFilters((prev) => (Object.keys(prev).length > 0 ? {} : prev));
    if (schemeFilter === "all") {
      setFormFilterFields([]);
      return;
    }
    applications.getFilterFields(schemeFilter)
      .then((response) => {
        if (cancelled) return;
        setFormFilterFields(response.success && Array.isArray(response.data?.fields) ? response.data.fields : []);
      })
      .catch((error) => {
        console.error('❌ [FILTERS] Error loading form filter fields:', error);
        if (!cancelled) setFormFilterFields([]);
      });
    return () => { cancelled = true; };
  }, [schemeFilter]);

  const setFormFilter = useCallback((key: string, value: string) => {
    setFormFilters((prev) => {
      const next = { ...prev };
      if (!value || value === "all") delete next[key];
      else next[key] = value;
      return next;
    });
    setCurrentPage(1);
  }, []);

  // Only send selections for fields the current scheme actually exposes
  const buildFormFiltersParam = useCallback(() => {
    const active: Record<string, string> = {};
    formFilterFields.forEach((field) => {
      if (formFilters[field.key]) active[field.key] = formFilters[field.key];
    });
    return Object.keys(active).length > 0 ? JSON.stringify(active) : undefined;
  }, [formFilters, formFilterFields]);

  // Handle quick date filter change
  const handleQuickDateFilterChange = useCallback((range: QuickDateRange) => {
    setQuickDateFilter(range);
    
    if (range && range !== 'custom') {
      const dateRange = getDateRangeFromQuickFilter(range);
      if (dateRange) {
        setFromDate(dateRange.fromDate);
        setToDate(dateRange.toDate);
      }
    }
    
    // Reset to first page when filter changes
    setCurrentPage(1);
  }, []);

  // Handle custom date change
  const handleFromDateChange = useCallback((date: Date | undefined) => {
    setFromDate(date);
    if (quickDateFilter !== 'custom') {
      setQuickDateFilter('custom');
    }
    setCurrentPage(1);
  }, [quickDateFilter]);

  const handleToDateChange = useCallback((date: Date | undefined) => {
    setToDate(date);
    if (quickDateFilter !== 'custom') {
      setQuickDateFilter('custom');
    }
    setCurrentPage(1);
  }, [quickDateFilter]);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setSearchTerm("");
    setStatusFilter(defaultStatus || "all");
    setProjectFilter("all");
    setDistrictFilter("all");
    setAreaFilter("all");
    setUnitFilter("all");
    setSchemeFilter("all");
    setGenderFilter("all");
    setFormFilters({});
    setFromDate(undefined);
    setToDate(undefined);
    setQuickDateFilter(null);
    setCurrentPage(1);
  }, [defaultStatus]);

  // Get API params for filtering
  const getApiParams = useCallback((page?: number, limit: number = 10) => {
    const params: any = {
      page: page || currentPage,
      limit,
    };

    if (searchTerm) params.search = searchTerm;
    if (statusFilter !== "all") params.status = statusFilter;
    if (projectFilter !== "all") params.project = projectFilter;
    if (districtFilter !== "all") params.district = districtFilter;
    if (areaFilter !== "all") params.area = areaFilter;
    if (unitFilter !== "all") params.unit = unitFilter;
    if (schemeFilter !== "all") params.scheme = schemeFilter;
    if (genderFilter !== "all") params.gender = genderFilter;
    if (schemeFilter !== "all") {
      const formFiltersParam = buildFormFiltersParam();
      if (formFiltersParam) params.formFilters = formFiltersParam;
    }
    if (fromDate) params.fromDate = fromDate.toISOString();
    if (toDate) params.toDate = toDate.toISOString();
    if (quickDateFilter) params.quickDateFilter = quickDateFilter;

    // Debug log to verify filters are being sent
    console.log('🔍 API Params:', {
      page: params.page,
      limit: params.limit,
      hasSearch: !!params.search,
      status: params.status,
      hasProject: !!params.project,
      hasDistrict: !!params.district,
      hasArea: !!params.area,
      hasUnit: !!params.unit,
      hasScheme: !!params.scheme,
      hasGender: !!params.gender,
      hasDateRange: !!(params.fromDate && params.toDate),
      quickDateFilter: params.quickDateFilter,
      fromDate: params.fromDate ? new Date(params.fromDate).toLocaleDateString() : null,
      toDate: params.toDate ? new Date(params.toDate).toLocaleDateString() : null,
    });

    return params;
  }, [
    currentPage,
    searchTerm,
    statusFilter,
    projectFilter,
    districtFilter,
    areaFilter,
    unitFilter,
    schemeFilter,
    genderFilter,
    buildFormFiltersParam,
    fromDate,
    toDate,
    quickDateFilter
  ]);

  // Get export params (same as API params but without pagination)
  const getExportParams = useCallback(() => {
    const params: any = {};

    if (searchTerm) params.search = searchTerm;
    if (statusFilter !== "all") params.status = statusFilter;
    if (projectFilter !== "all") params.project = projectFilter;
    if (districtFilter !== "all") params.district = districtFilter;
    if (areaFilter !== "all") params.area = areaFilter;
    if (unitFilter !== "all") params.unit = unitFilter;
    if (schemeFilter !== "all") params.scheme = schemeFilter;
    if (genderFilter !== "all") params.gender = genderFilter;
    if (schemeFilter !== "all") {
      const formFiltersParam = buildFormFiltersParam();
      if (formFiltersParam) params.formFilters = formFiltersParam;
    }
    if (fromDate) params.fromDate = fromDate.toISOString();
    if (toDate) params.toDate = toDate.toISOString();
    if (quickDateFilter) params.quickDateFilter = quickDateFilter;

    return params;
  }, [
    searchTerm,
    statusFilter,
    projectFilter,
    districtFilter,
    areaFilter,
    unitFilter,
    schemeFilter,
    genderFilter,
    buildFormFiltersParam,
    fromDate,
    toDate,
    quickDateFilter
  ]);

  // Dropdown options
  const projectOptions = [
    { value: "all", label: "All Projects" },
    ...projectsList.map(project => ({ value: project._id, label: project.name }))
  ];

  const districtOptions = [
    { value: "all", label: "All Districts" },
    ...districts.map(district => ({ value: district._id, label: district.name }))
  ];

  const areaOptions = [
    { value: "all", label: "All Areas" },
    ...areas.map(area => ({ value: area._id, label: area.name }))
  ];

  const unitOptions = [
    { value: "all", label: "All Units" },
    ...units.map(unit => ({ value: unit._id, label: unit.name }))
  ];

  const schemeOptions = [
    { value: "all", label: "All Schemes" },
    ...schemesList.map(scheme => ({ value: scheme._id, label: scheme.name }))
  ];

  return {
    // Filter states
    filters: {
      searchTerm,
      statusFilter,
      projectFilter,
      districtFilter,
      areaFilter,
      unitFilter,
      schemeFilter,
      genderFilter,
      formFilters,
      fromDate,
      toDate,
      quickDateFilter,
      currentPage,
    },
    
    // Filter setters
    setSearchTerm: (value: string) => { setSearchTerm(value); setCurrentPage(1); },
    setStatusFilter: (value: string) => { setStatusFilter(value); setCurrentPage(1); },
    setProjectFilter: (value: string) => { setProjectFilter(value); setCurrentPage(1); },
    setDistrictFilter: (value: string) => { setDistrictFilter(value); setCurrentPage(1); },
    setAreaFilter: (value: string) => { setAreaFilter(value); setCurrentPage(1); },
    setUnitFilter: (value: string) => { setUnitFilter(value); setCurrentPage(1); },
    setSchemeFilter: (value: string) => { setSchemeFilter(value); setCurrentPage(1); },
    setGenderFilter: (value: string) => { setGenderFilter(value); setCurrentPage(1); },
    setFormFilter,
    setFromDate: handleFromDateChange,
    setToDate: handleToDateChange,
    setQuickDateFilter: handleQuickDateFilterChange,
    setCurrentPage,
    
    // Dropdown data
    dropdownData: {
      projectsList,
      schemesList,
      districts,
      areas,
      units,
    },
    
    // Dropdown options
    dropdownOptions: {
      projectOptions,
      districtOptions,
      areaOptions,
      unitOptions,
      schemeOptions,
    },

    // Scheme-specific form-builder dropdown filters (empty unless a scheme is selected)
    formFilterFields,
    
    // Helper functions
    clearAllFilters,
    getApiParams,
    getExportParams,
    loadingDropdowns,
    
    // Reload dropdown data
    reloadDropdowns: loadDropdownData,
  };
}

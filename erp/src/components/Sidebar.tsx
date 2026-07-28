import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useRBAC } from "@/hooks/useRBAC";
import { useAuth } from "@/hooks/useAuth";
import { useConfig } from "@/hooks/useConfig";
import { menuCategories, limitedAdminMenuCategories } from "@/lib/menuConfig";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const { hasAnyPermission } = useRBAC();
  const { user } = useAuth();
  const { menuStyle, sidebarSearchEnabled } = useConfig();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  // Menu style padding classes
  const menuPaddingClasses = {
    compact: 'py-1.5 px-2.5',
    comfortable: 'py-2 px-2.5',
    spacious: 'py-2.5 px-3'
  };

  const itemPaddingClass = menuPaddingClasses[menuStyle] || menuPaddingClasses.comfortable;

  // Check if user is a limited admin (area/district/unit/area_president)
  const isLimitedAdmin = user && ['area_admin', 'district_admin', 'unit_admin', 'area_president'].includes(user.role);

  // unit_admin and area_president don't have subordinates → hide Admin Hierarchy
  const hideHierarchy = user && ['unit_admin', 'area_president'].includes(user.role);

  // Filter menu items for limited admins
  const getFilteredMenuCategories = () => {
    if (!isLimitedAdmin) {
      return menuCategories;
    }

    if (!hideHierarchy) {
      return limitedAdminMenuCategories;
    }

    // Remove Admin Hierarchy item for unit_admin / area_president
    return limitedAdminMenuCategories.map(cat => ({
      ...cat,
      items: cat.items.filter((item: any) => item.to !== '/admin-hierarchy'),
    }));
  };

  const filteredMenuCategories = getFilteredMenuCategories();

  // Flatten all menu items for search
  const allNavItems = filteredMenuCategories.flatMap(cat =>
    cat.items.flatMap((item: any) => {
      if (item.submenu) {
        // For submenu items, inherit the parent icon
        return item.submenu.map((subItem: any) => ({
          ...subItem,
          icon: item.icon // Use parent icon for submenu items
        }));
      }
      return [item];
    })
  ) as Array<{ to: string; label: string; icon: any; permissions: string[] }>;

  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    "Projects Management": true,
    "Financial Management": true,
    "Administration": true,
    "Donors": true,
  });

  // Flyout submenu panel — holds the label of the menu item whose submenu is open
  const [activeFlyout, setActiveFlyout] = useState<string | null>(null);

  // Close the flyout whenever the route changes
  useEffect(() => {
    setActiveFlyout(null);
  }, [location.pathname, location.search]);

  const toggleCategory = (label: string) => {
    setOpenCategories(prev => ({ ...prev, [label]: !prev[label] }));
  };

  // Helper function to check if a submenu item is active based on URL and query params
  const isSubmenuItemActive = (itemPath: string) => {
    const currentPath = location.pathname;
    const searchParams = new URLSearchParams(location.search);
    const filterParam = searchParams.get('filter');

    // Check for payment tracking filter-based routes
    if (currentPath === '/payment-tracking/all') {
      if (filterParam) {
        // If there's a filter, match it to the corresponding submenu item
        const filterToPathMap: Record<string, string> = {
          'overdue': '/payment-tracking/overdue',
          'due-soon': '/payment-tracking/due-soon',
          'upcoming': '/payment-tracking/upcoming',
          'processing': '/payment-tracking/processing',
          'completed': '/payment-tracking/completed',
        };
        return filterToPathMap[filterParam] === itemPath;
      } else {
        // No filter means "All Payments" should be active
        return itemPath === '/payment-tracking/all';
      }
    }

    // Check for application filter-based routes
    if (currentPath === '/applications/all') {
      if (filterParam) {
        const filterToPathMap: Record<string, string> = {
          'pending': '/applications/pending',
          'interview-scheduled': '/applications/interview-scheduled',
          'approved': '/applications/approved',
          'rejected': '/applications/rejected',
          'completed': '/applications/completed',
        };
        return filterToPathMap[filterParam] === itemPath;
      } else {
        return itemPath === '/applications/all';
      }
    }

    // Direct path match for other routes
    if (currentPath === itemPath) {
      return true;
    }

    return false;
  };

  // Filter menu items based on permissions
  const hasAccessToItem = (item: any) => {
    // Check super admin requirement
    if (item.requireSuperAdmin && user?.role !== 'super_admin') {
      return false;
    }

    if (!item.permissions || item.permissions.length === 0) {
      return true; // No permissions required
    }
    return hasAnyPermission(item.permissions);
  };

  // Filter categories to only show items user has access to
  const filteredCategories = filteredMenuCategories.map(category => ({
    ...category,
    items: category.items.filter(hasAccessToItem)
  })).filter(category => category.items.length > 0);

  const filteredItems = searchQuery
    ? allNavItems.filter(item =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) &&
        hasAccessToItem(item)
      )
    : null;

  // The currently open flyout item (with its submenu), if any
  const flyoutItem = activeFlyout
    ? filteredCategories
        .flatMap(cat => cat.items)
        .find((item: any) => item.submenu && item.label === activeFlyout)
    : null;

  const closeFlyout = () => setActiveFlyout(null);

  const handleFlyoutToggle = (label: string) => {
    setActiveFlyout(prev => (prev === label ? null : label));
  };

  // Is any submenu route of this item currently active?
  const isParentActive = (item: any) =>
    item.submenu?.some((subItem: any) => isSubmenuItemActive(subItem.to));

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] w-64 border-r border-border/40 bg-card/80 backdrop-blur-xl shadow-elegant transition-transform duration-300 md:translate-x-0 overflow-y-auto scrollbar-hide",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarSearchEnabled && (
          <div className="p-3 border-b border-border/40 bg-background/40 backdrop-blur">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search menu..."
                className="pl-8 h-8 rounded-lg bg-background/70 text-[13px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        )}

        <nav className="space-y-1 p-3">
          {filteredItems ? (
            // Search results
            filteredItems.length > 0 ? (
              filteredItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-all",
                    itemPaddingClass,
                    isActive
                      ? "bg-gradient-primary text-primary-foreground shadow-glow"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  )
                }
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
              ))
            ) : (
              <div className="text-center text-[13px] text-muted-foreground py-4">
                No menu items found
              </div>
            )
          ) : (
            // Categorized menu
            filteredCategories.map((category, idx) => (
              <div key={idx} className="mb-3 last:mb-0">
                {category.label ? (
                  <Collapsible
                    open={openCategories[category.label] ?? true}
                    onOpenChange={() => toggleCategory(category.label!)}
                  >
                  <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
                      {category.label}
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 transition-transform",
                          openCategories[category.label] && "transform rotate-180"
                        )}
                      />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-0.5 mt-1">
                      {category.items.map((item) => (
                        item.submenu ? (
                          // Item with submenu → opens the right-side flyout panel
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => handleFlyoutToggle(item.label)}
                            className={cn(
                              "flex items-center justify-between w-full rounded-lg text-[13px] font-medium transition-all",
                              itemPaddingClass,
                              isParentActive(item) || activeFlyout === item.label
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <item.icon className="h-4 w-4 shrink-0" />
                              <span className="truncate">{item.label}</span>
                            </div>
                            <ChevronRight
                              className={cn(
                                "h-3.5 w-3.5 shrink-0 transition-transform",
                                activeFlyout === item.label && "translate-x-0.5"
                              )}
                            />
                          </button>
                        ) : (
                          // Regular item
                          <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={() => { closeFlyout(); onClose?.(); }}
                            className={({ isActive }) =>
                              cn(
                              "flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-all",
                                itemPaddingClass,
                                isActive
                                ? "bg-gradient-primary text-primary-foreground shadow-glow"
                                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                              )
                            }
                          >
                            <item.icon className="h-4 w-4 shrink-0" />
                            <span className="truncate">{item.label}</span>
                          </NavLink>
                        )
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                ) : (
                  // Uncategorized items
                  <div className="space-y-0.5">
                    {category.items.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => { closeFlyout(); onClose?.(); }}
                        className={({ isActive }) =>
                          cn(
                          "flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-all",
                            itemPaddingClass,
                            isActive
                            ? "bg-gradient-primary text-primary-foreground shadow-glow"
                            : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                          )
                        }
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </nav>
      </aside>

      {/* ── Flyout submenu panel (opens beside the sidebar) ── */}
      {flyoutItem && (
        <>
          {/* Click-away overlay over the content area */}
          <div
            className="fixed inset-0 z-30 bg-background/30 backdrop-blur-[2px]"
            onClick={closeFlyout}
          />
          <div
            className={cn(
              "fixed top-16 z-40 h-[calc(100vh-4rem)] w-64 md:w-60 border-r border-border/40 bg-card shadow-elegant overflow-y-auto scrollbar-hide",
              "left-0 md:left-64",
              "animate-in fade-in-0 slide-in-from-left-2 duration-200"
            )}
          >
            <div className="flex items-center justify-between px-3 py-3 border-b border-border/40">
              <div className="flex items-center gap-2.5 min-w-0">
                <flyoutItem.icon className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-[13px] font-semibold truncate">{flyoutItem.label}</span>
              </div>
              <button
                type="button"
                onClick={closeFlyout}
                className="flex items-center justify-center h-6 w-6 rounded-md text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <nav className="space-y-0.5 p-3">
              {flyoutItem.submenu!.filter(hasAccessToItem).map((subItem: any) => (
                <NavLink
                  key={subItem.to}
                  to={subItem.to}
                  onClick={() => { closeFlyout(); onClose?.(); }}
                  className={() =>
                    cn(
                      "flex items-center rounded-lg text-[13px] font-medium transition-all",
                      itemPaddingClass,
                      isSubmenuItemActive(subItem.to)
                        ? "bg-gradient-primary text-primary-foreground shadow-glow"
                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    )
                  }
                >
                  <span className="truncate">{subItem.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        </>
      )}
    </>
  );
}

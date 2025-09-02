import { Car, Plus, BarChart3, FileText, Users } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";


const menuItems = [
  { title: "Dashboard", path: "/", icon: BarChart3 },
  { title: "Add Service", path: "/add-record", icon: FileText },
  { title: "Reports", path: "/reports", icon: FileText },
  { title: "Staff", path: "/staff", icon: Users },
];

export function AppSidebar() {
  const { state, setOpenMobile, isMobile } = useSidebar();
  const location = useLocation();
  const isCollapsed = state === "collapsed";

  const isActive = (path: string) => location.pathname === path;

  const handleMenuClick = () => {
    // Close mobile sidebar when menu item is clicked
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar collapsible="icon">
      {/* Add hidden title for accessibility */}
      <h2 className="sr-only">Navigation Menu</h2>
      <SidebarContent className="bg-card border-r">
        {/* Header */}
        <div className={`${isCollapsed ? 'p-2' : 'p-4'} border-b`}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
            <div className={`${isCollapsed ? 'p-1.5' : 'p-2'} bg-gradient-to-r from-primary to-primary-hover rounded-lg`}>
              <Car className={`${isCollapsed ? 'h-4 w-4' : 'h-6 w-6'} text-primary-foreground`} />
            </div>
            {!isCollapsed && (
              <div>
                <h2 className="text-lg font-bold bg-gradient-to-r from-primary to-primary-hover bg-clip-text text-transparent">
                  AutoWash Pro
                </h2>
                <p className="text-xs text-muted-foreground">Management System</p>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup className="py-4">
          <SidebarGroupLabel className={isCollapsed ? "sr-only" : ""}>
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    asChild
                    className={`w-full justify-start transition-all duration-200 ${
                      isActive(item.path)
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "hover:bg-muted"
                    }`}
                  >
                    <Link to={item.path} onClick={handleMenuClick}> 
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span className="ml-3">{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Footer Stats */}
        {!isCollapsed && (
          <div className="mt-auto p-4 border-t">
            <div className="text-xs text-muted-foreground text-center">
              Professional Car Wash
              <br />
              Management Solution
            </div>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
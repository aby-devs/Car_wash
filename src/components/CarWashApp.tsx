import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { CarWashRecordForm, CarWashRecord, ServiceManagement } from "./CarWashRecord";
import { CarWashRecords } from "./CarWashRecords";
import { Dashboard } from "./Dashboard";
import { AppSidebar } from "./AppSidebar";
import { Car, Database, Menu } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Sample data for demo purposes
const sampleRecords: CarWashRecord[] = [
  {
    id: "SO-2024-001",
    registrationNumber: "KCA 123A",
    carModel: "Toyota Camry",
    services: "Exterior wash, Interior cleaning, Waxing",
    amountPaid: 1500,
    paymentMethod: "Mpesa",
    attendant: "John Kamau",
    date: new Date().toLocaleDateString(),
    time: "09:30 AM",
    status: "Completed",
    mpesaCode: "QHX123ABC"
  },
  {
    id: "SO-2024-002", 
    registrationNumber: "KBB 456B",
    carModel: "Honda Civic",
    services: "Full service wash, Tire cleaning",
    amountPaid: 1200,
    paymentMethod: "Cash",
    attendant: "Mary Wanjiku",
    date: new Date(Date.now() - 86400000).toLocaleDateString(),
    time: "11:15 AM",
    status: "Pending"
  },
  {
    id: "SO-2024-003",
    registrationNumber: "KDD 789C", 
    carModel: "Nissan X-Trail",
    services: "Exterior wash, Engine bay cleaning",
    amountPaid: 2000,
    paymentMethod: "Mpesa", 
    attendant: "Peter Mwangi",
    date: new Date(Date.now() - 172800000).toLocaleDateString(),
    time: "02:45 PM",
    status: "Completed",
    mpesaCode: "QHX456DEF"
  }
];

export function CarWashApp() {
  const [records, setRecords] = useState<CarWashRecord[]>([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const { toast } = useToast();

  const handleAddRecord = (newRecord: Omit<CarWashRecord, 'id'>) => {
    const currentYear = new Date().getFullYear();
    const recordCount = records.length + 1;
    const record: CarWashRecord = {
      ...newRecord,
      id: `SO-${currentYear}-${recordCount.toString().padStart(3, '0')}`
    };
    setRecords(prev => [...prev, record]);
  };

  const loadSampleData = () => {
    setRecords(sampleRecords);
    toast({
      title: "Sample Data Loaded",
      description: "Demo records have been added to showcase the system features.",
    });
  };

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard records={records} />;
      case "add-record":
        return <ServiceManagement records={records} onAddRecord={handleAddRecord} />;
      case "records":
        return <CarWashRecords records={records} />;
      default:
        return <Dashboard records={records} />;
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <div className="flex-1 flex flex-col">
          {/* Top Header */}
          <header className="h-16 border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50 flex items-center justify-between px-4">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-primary to-primary-hover rounded-lg">
                  <Car className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary-hover bg-clip-text text-transparent">
                    AutoWash Pro
                  </h1>
                  <p className="text-xs text-muted-foreground">Car Wash Management</p>
                </div>
              </div>
            </div>

            {records.length === 0 && (
              <Button 
                onClick={loadSampleData}
                variant="outline"
                size="sm"
              >
                <Database className="mr-2 h-4 w-4" />
                Load Sample Data
              </Button>
            )}
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto bg-background">
            <div className="container mx-auto p-4 md:p-6">
              {renderContent()}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
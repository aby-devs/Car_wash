import { useState, useEffect } from "react";
import { ServiceManagement } from "@/components/CarWashRecord";
import { CarWashRecord } from "@/components/CarWashRecord";
import { apiService } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

export function AddRecordPage() {
  const [records, setRecords] = useState<CarWashRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Load records from API on component mount
  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getRecords({ limit: 100 });
      if (response.success && response.data) {
        setRecords(response.data);
      } else {
        throw new Error(response.message || 'Failed to load records');
      }
    } catch (err) {
      console.error('Error loading records:', err);
      setError(err instanceof Error ? err.message : 'Failed to load records');
      toast({
        title: "Error Loading Records",
        description: "Could not connect to the server. Using offline mode.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecord = async (newRecord: Omit<CarWashRecord, 'id' | 'date' | 'time' | 'status' | 'createdAt' | 'updatedAt'>) => {
    try {
      const response = await apiService.addRecord(newRecord);
      if (response.success && response.data) {
        setRecords(prev => [response.data!, ...prev]);
        toast({
          title: "Record Added",
          description: "Car wash record has been successfully saved.",
        });
      } else {
        throw new Error(response.message || 'Failed to add record');
      }
    } catch (err) {
      console.error('Error adding record:', err);
      toast({
        title: "Error Adding Record",
        description: err instanceof Error ? err.message : 'Failed to add record',
        variant: "destructive"
      });
    }
  };

  return (
    <div className="w-full min-h-screen p-4 sm:p-6 md:p-8 lg:p-10">
      <ServiceManagement records={records} onAddRecord={handleAddRecord} />
    </div>
  );
}

import { useState, useEffect } from "react";
import { CarWashRecords } from "@/components/CarWashRecords";
import { CarWashRecord, DashboardStats } from "@/components/CarWashRecord";
import { apiService } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

export function ReportsPage() {
  const [records, setRecords] = useState<CarWashRecord[]>([]);
  const [todayStats, setTodayStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Load records and today's stats from API on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load both records and today's stats in parallel
      const [recordsResponse, todayStatsResponse] = await Promise.all([
        apiService.getRecords({ limit: 100 }),
        apiService.getDashboardStats('today')
      ]);
      
      if (recordsResponse.success && recordsResponse.data) {
        setRecords(recordsResponse.data);
      } else {
        throw new Error(recordsResponse.message || 'Failed to load records');
      }
      
      if (todayStatsResponse.success && todayStatsResponse.data) {
        setTodayStats(todayStatsResponse.data);
      }
      
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      toast({
        title: "Error Loading Data",
        description: "Could not connect to the server. Using offline mode.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <CarWashRecords records={records} todayStats={todayStats} />
    </div>
  );
}

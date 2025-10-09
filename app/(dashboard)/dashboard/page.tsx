export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border p-6">
          <h3 className="text-sm font-medium text-muted-foreground">
            Total Due
          </h3>
          <p className="mt-2 text-3xl font-bold">₹0</p>
        </div>
        <div className="rounded-lg border p-6">
          <h3 className="text-sm font-medium text-muted-foreground">
            Paid This Month
          </h3>
          <p className="mt-2 text-3xl font-bold">₹0</p>
        </div>
        <div className="rounded-lg border p-6">
          <h3 className="text-sm font-medium text-muted-foreground">
            Pending Count
          </h3>
          <p className="mt-2 text-3xl font-bold">0</p>
        </div>
        <div className="rounded-lg border p-6">
          <h3 className="text-sm font-medium text-muted-foreground">
            Avg Processing Time
          </h3>
          <p className="mt-2 text-3xl font-bold">0 days</p>
        </div>
      </div>
    </div>
  );
}

import CustomersTable from './components/CustomersTable';

export default function CustomersPage() {
  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <CustomersTable />
      </div>
    </div>
  );
}

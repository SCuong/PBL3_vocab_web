const AdminDashboard = () => (
    <div className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-4xl mb-12">Admin Control</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass-card p-8"><h3>Users</h3><p className="text-4xl font-bold">1,280</p></div>
            <div className="glass-card p-8"><h3>Topics</h3><p className="text-4xl font-bold">42</p></div>
            <div className="glass-card p-8"><h3>Words</h3><p className="text-4xl font-bold">2,450</p></div>
        </div>
    </div>
);

export default AdminDashboard;

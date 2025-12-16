import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import RequestList from './components/RequestList';
import RequestForm from './components/RequestForm';
import { MOCK_REQUESTS } from './constants';
import { RequestItem, RequestCategory, NewRequestPayload } from './types';

type ViewState = 'list' | 'create';

function App() {
  const [view, setView] = useState<ViewState>('list');
  const [editingItem, setEditingItem] = useState<RequestItem | null>(null);
  const [requests, setRequests] = useState<RequestItem[]>(MOCK_REQUESTS);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleEdit = (item: RequestItem) => {
    setEditingItem(item);
    setView('create');
  };

  const handleCreateNew = () => {
    setEditingItem(null);
    setView('create');
  };

  const handleSave = (data: NewRequestPayload) => {
    if (editingItem) {
      // Update existing item
      setRequests(prev => prev.map(item => 
        item.id === editingItem.id 
          ? { ...item, ...data } // Merge existing data (id, rut, category) with form data
          : item
      ));
    } else {
      // Create new item
      const newItem: RequestItem = {
        id: Math.random().toString(36).substr(2, 9),
        name: data.name,
        rut: '11.111.111-1', // Placeholder RUT since not in form
        requirement: data.requirement,
        category: RequestCategory.Courses, // Default category
        status: data.status,
        adjudicationDate: data.adjudicationDate || '-',
        expirationDate: data.expirationDate || '-',
      };
      setRequests(prev => [newItem, ...prev]);
    }
    
    setEditingItem(null);
    setView('list');
  };

  return (
    <div className="relative flex min-h-screen w-full flex-row overflow-x-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <button 
          onClick={() => setSidebarOpen(true)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined text-gray-600">menu</span>
        </button>
        <h2 className="text-lg font-semibold text-[#111318]">Gestión de Solicitudes</h2>
        <div className="w-10"></div> {/* Spacer for centering */}
      </div>

      <main className="flex flex-1 flex-col h-full min-h-screen bg-[#f8fafc] pt-[60px] lg:pt-0">
        {view === 'list' ? (
          <RequestList 
            requests={requests} 
            onCreateNew={handleCreateNew} 
            onEdit={handleEdit}
          />
        ) : (
          <RequestForm 
            onBack={() => setView('list')} 
            onSave={handleSave} 
            initialData={editingItem}
          />
        )}
      </main>
    </div>
  );
}

export default App;
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
      <Sidebar />
      <main className="flex flex-1 flex-col h-full min-h-screen bg-[#f8fafc]">
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
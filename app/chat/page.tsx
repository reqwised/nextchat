'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Send, LogOut, Users, Search, Menu, X } from 'lucide-react';

interface User {
  id: string;
  name: string;
  role: number;
}

interface Message {
  id: number;
  type: string;
  message: string;
  sender: string;
  sender_name?: string;
  created_at?: string;
}

interface Room {
  id: number;
  name: string;
  image_url: string;
  participants: User[];
  last_message?: string;
  last_message_time?: string;
}

export default function ChatPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check authentication
  useEffect(() => {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) {
      router.push('/');
      return;
    }
    
    const user = JSON.parse(userStr);
    setCurrentUser(user);
    loadRooms(user.id);
  }, []);

  // Load rooms
  const loadRooms = async (userId: string) => {
    try {
      const res = await fetch('/api/rooms', {
        headers: { 'x-user-id': userId }
      });
      const data = await res.json();
      
      if (res.ok) {
        setRooms(data.rooms || []);
        // Auto-select first room
        if (data.rooms && data.rooms.length > 0) {
          selectRoom(data.rooms[0], userId);
        }
      }
    } catch (err) {
      console.error('Error loading rooms:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Select room and load messages
  const selectRoom = async (room: Room, userId?: string) => {
    setSelectedRoom(room);
    setIsSidebarOpen(false);
    
    const uid = userId || currentUser?.id;
    if (!uid) return;

    try {
      const res = await fetch(`/api/messages/${room.id}`, {
        headers: { 'x-user-id': uid }
      });
      const data = await res.json();
      
      if (res.ok) {
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedRoom || !currentUser) return;

    const tempMessage: Message = {
      id: Date.now(),
      type: 'text',
      message: newMessage,
      sender: currentUser.id,
      sender_name: currentUser.name,
      created_at: new Date().toISOString()
    };

    setMessages([...messages, tempMessage]);
    setNewMessage('');

    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify({
          roomId: selectedRoom.id,
          message: newMessage,
          type: 'text'
        })
      });

      if (res.ok) {
        // Reload messages to get accurate data from server
        selectRoom(selectedRoom);
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    router.push('/');
  };

  const getRoleColor = (role: number) => {
    switch(role) {
      case 0: return 'bg-red-500';
      case 1: return 'bg-blue-500';
      case 2: return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getRoleName = (role: number) => {
    switch(role) {
      case 0: return 'Admin';
      case 1: return 'Agent';
      case 2: return 'Customer';
      default: return 'User';
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className="h-screen flex bg-gray-100">
      {/* Sidebar - Rooms List */}
      <div className={`
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 fixed lg:relative z-30 w-80 bg-white border-r border-gray-200 h-full transition-transform duration-300
      `}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-200 bg-blue-500 text-white">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold">Chats</h2>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="lg:hidden hover:bg-blue-600 p-2 rounded-lg transition"
              >
                <X size={24} />
              </button>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white text-blue-500 rounded-full flex items-center justify-center font-bold">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-semibold">{currentUser.name}</p>
                <p className="text-xs opacity-90">{getRoleName(currentUser.role)}</p>
              </div>
              <button
                onClick={handleLogout}
                className="hover:bg-blue-600 p-2 rounded-lg transition"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Cari chat..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Rooms List */}
          <div className="flex-1 overflow-y-auto">
            {rooms.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <p>Tidak ada chat tersedia</p>
              </div>
            ) : (
              rooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => selectRoom(room)}
                  className={`
                    p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition
                    ${selectedRoom?.id === room.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}
                  `}
                >
                  <div className="flex items-start space-x-3">
                    <img
                      src={room.image_url}
                      alt={room.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-800 truncate">{room.name}</h3>
                        <span className="text-xs text-gray-500">{room.participants?.length || 0}</span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {room.last_message || 'No messages'}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedRoom ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="lg:hidden hover:bg-gray-100 p-2 rounded-lg transition"
                >
                  <Menu size={24} />
                </button>
                <img
                  src={selectedRoom.image_url}
                  alt={selectedRoom.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <h2 className="font-semibold text-gray-800">{selectedRoom.name}</h2>
                  <p className="text-xs text-gray-500">
                    {selectedRoom.participants?.length || 0} participants
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                {selectedRoom.participants?.map((participant) => (
                  <div
                    key={participant.id}
                    className={`w-8 h-8 ${getRoleColor(participant.role)} rounded-full flex items-center justify-center text-white text-xs font-bold`}
                    title={`${participant.name} - ${getRoleName(participant.role)}`}
                  >
                    {participant.name.charAt(0).toUpperCase()}
                  </div>
                ))}
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <p>Belum ada pesan</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isCurrentUser = msg.sender === currentUser.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className="max-w-xs lg:max-w-md xl:max-w-lg">
                        {!isCurrentUser && (
                          <p className="text-xs text-gray-600 mb-1 px-2">{msg.sender_name}</p>
                        )}
                        <div
                          className={`
                            px-4 py-2 rounded-2xl
                            ${isCurrentUser 
                              ? 'bg-blue-500 text-white rounded-br-none' 
                              : 'bg-white text-gray-800 rounded-bl-none shadow'
                            }
                          `}
                        >
                          <p className="break-words">{msg.message}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ketik pesan..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="bg-blue-500 text-white px-6 py-3 rounded-full hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Users size={64} className="mx-auto mb-4 opacity-50" />
              <p className="text-xl">Pilih chat untuk memulai</p>
            </div>
          </div>
        )}
      </div>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
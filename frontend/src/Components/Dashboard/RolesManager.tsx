import React, { useState, useEffect } from 'react';
import {
  UserGroupIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

interface Role {
  id: string;
  name: string;
  color: number;
  position: number;
  permissions: string;
  memberCount: number;
}

interface RolesManagerProps {
  guildId: string;
  guildData?: any;
  onUpdate: () => void;
}

const RolesManager: React.FC<RolesManagerProps> = ({ guildId, guildData, onUpdate }) => {
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [bypassRoles, setBypassRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadRoles();
  }, [guildId]);

  useEffect(() => {
    if (guildData) {
      setBypassRoles(guildData.bypass_roles || []);
    }
  }, [guildData]);

  const loadRoles = async () => {
    try {
      const response = await fetch(`/api/guild/${guildId}/roles/available`);
      const data = await response.json();
      if (data.success) {
        const filteredRoles = data.roles
          .filter((role: Role) => role.name !== '@everyone')
          .sort((a: Role, b: Role) => b.position - a.position);
        setAvailableRoles(filteredRoles);
      }
    } catch (error) {
      console.error('Error loading roles:', error);
    }
    setLoading(false);
  };

  const toggleRole = async (roleId: string) => {
    if (updating) return;
    setUpdating(true);

    const isCurrentlyBypassed = bypassRoles.includes(roleId);

    try {
      const response = await fetch(`/api/guild/${guildId}/roles`, {
        method: isCurrentlyBypassed ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_id: roleId }),
      });

      const data = await response.json();
      if (data.success) {
        if (isCurrentlyBypassed) {
          setBypassRoles(prev => prev.filter(id => id !== roleId));
        } else {
          setBypassRoles(prev => [...prev, roleId]);
        }
        onUpdate();
      } else {
        alert('Failed to update role: ' + data.error);
      }
    } catch (error) {
      alert('Error updating role');
      console.error(error);
    }
    setUpdating(false);
  };

  const getRoleColor = (color: number) => {
    if (color === 0) return '#99AAB5';
    return `#${color.toString(16).padStart(6, '0')}`;
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading roles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-transparent p-6">
      <div className="w-full max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl shadow-lg mb-4">
            <UserGroupIcon className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
            Role Management
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Grant roles the power to bypass filters
          </p>
        </div>

        {/* Warning Card */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-6 shadow-xl">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-r from-amber-100 to-orange-100 rounded-xl flex items-center justify-center">
                <InformationCircleIcon className="w-6 h-6 text-amber-600" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-amber-800">⚠️ Important Notice</h3>
              <div className="space-y-2 text-amber-700">
                <p>Users with enabled roles gain significant permissions:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Bypass all filter restrictions</li>
                  <li>Access to bot management settings</li>
                  <li>Override moderation actions</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Roles List */}
        <div className="bg-gray-50 rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 bg-white">
            <h2 className="text-2xl font-bold text-gray-800">
              Server Roles 
              <span className="ml-3 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                {availableRoles.length}
              </span>
            </h2>
          </div>
          
          <div className="p-6 bg-white">
            <div className="space-y-3">
              {availableRoles.map((role) => {
                const isBypassed = bypassRoles.includes(role.id);
                const roleColor = getRoleColor(role.color);
                
                return (
                  <div
                    key={role.id}
                    onClick={() => !updating && toggleRole(role.id)}
                    className={`group relative overflow-hidden rounded-xl border-2 transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:shadow-lg ${
                      isBypassed
                        ? 'border-green-300 bg-gradient-to-r from-green-50 to-emerald-50 shadow-green-100'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    } ${updating ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div 
                              className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
                              style={{ backgroundColor: roleColor, opacity: 0.9 }}
                            >
                              <UserGroupIcon className="w-6 h-6 text-white" />
                            </div>
                          </div>
                          
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800" style={{ color: roleColor }}>
                              {role.name}
                            </h3>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-sm text-gray-500">
                                {role.memberCount} members
                              </span>
                              {isBypassed && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Bypass Active
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className={`relative w-14 h-7 rounded-full transition-all duration-300 shadow-inner ${
                          isBypassed 
                            ? 'bg-gradient-to-r from-green-400 to-green-500 shadow-green-200' 
                            : 'bg-gradient-to-r from-gray-300 to-gray-400 shadow-gray-200'
                        }`}>
                          <div
                            className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-lg transition-all duration-300 ${
                              isBypassed ? 'translate-x-7' : 'translate-x-0.5'
                            }`}
                          ></div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Animated background effect */}
                    <div 
                      className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300"
                      style={{ backgroundColor: roleColor }}
                    ></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {updating && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 shadow-2xl">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600 mx-auto mb-4"></div>
                <p className="text-lg font-medium text-gray-800">Updating roles...</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RolesManager;

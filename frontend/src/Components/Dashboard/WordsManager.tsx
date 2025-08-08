import React, { useState, useEffect, useRef } from 'react';
import {
  PlusIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  DocumentArrowUpIcon,
  SparklesIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  CloudArrowUpIcon,
  DocumentPlusIcon,
} from '@heroicons/react/24/outline';
import { ExclamationTriangleIcon as ExclamationTriangleIconSolid } from '@heroicons/react/24/solid';

interface WordsManagerProps {
  guildId: string;
  guildData?: any;
  onUpdate: () => void;
}

const WordsManager: React.FC<WordsManagerProps> = ({ guildId, guildData, onUpdate }) => {
  // CORRECT BACKEND STATE - Using your exact state structure
  const [customWords, setCustomWords] = useState<string[]>([]);
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());
  const [newWord, setNewWord] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // CORRECT BACKEND - Load custom_words from guildData
  useEffect(() => {
    if (guildData) {
      setCustomWords(guildData.custom_words || []);
      setSelectedWords(new Set());
    }
  }, [guildData]);

  // CORRECT BACKEND - Add single word with your exact API structure
  const addWord = async () => {
    const word = newWord.trim().toLowerCase();
    if (!word) return;

    if (customWords.includes(word)) {
      alert('Word already exists!');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/guild/${guildId}/words`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          words: [word],
          type: 'custom'
        }),
      });

      const data = await response.json();
      if (data.success) {
        setCustomWords(prev => [...prev, word]);
        setNewWord('');
        onUpdate();
      } else {
        alert('Failed to add word: ' + data.error);
      }
    } catch (error) {
      alert('Error adding word');
      console.error(error);
    }
    setLoading(false);
  };

  // CORRECT BACKEND - Remove words with your exact API structure
  const removeWords = async (wordsToRemove: string[]) => {
    if (wordsToRemove.length === 0) {
      alert('No words selected');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/guild/${guildId}/words`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          words: wordsToRemove,
          type: 'custom'
        }),
      });

      const data = await response.json();
      if (data.success) {
        setCustomWords(prev => prev.filter(w => !wordsToRemove.includes(w)));
        setSelectedWords(new Set());
        onUpdate();
      } else {
        alert('Failed to remove words: ' + data.error);
      }
    } catch (error) {
      alert('Error removing words');
      console.error(error);
    }
    setLoading(false);
  };

  // NEW FEATURE - Clear all words (following the same backend pattern)
  const clearAllWords = async () => {
    if (customWords.length === 0) {
      alert('No words to clear');
      return;
    }

    if (!confirm(`Are you sure you want to remove all ${customWords.length} blocked words? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/guild/${guildId}/words`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          words: customWords, // Send all words to be deleted
          type: 'custom'
        }),
      });

      const data = await response.json();
      if (data.success) {
        setCustomWords([]);
        setSelectedWords(new Set());
        onUpdate();
        alert('All blocked words have been cleared!');
      } else {
        alert('Failed to clear words: ' + data.error);
      }
    } catch (error) {
      alert('Error clearing words');
      console.error(error);
    }
    setLoading(false);
  };

  // CORRECT BACKEND - Toggle word selection with Set
  const toggleWordSelection = (word: string) => {
    setSelectedWords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(word)) {
        newSet.delete(word);
      } else {
        newSet.add(word);
      }
      return newSet;
    });
  };

  // CORRECT BACKEND - File upload with your exact logic
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.txt')) {
      alert('Please upload a .txt file');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        
        // Extract words using regex to split by space, comma, semicolon, newline
        const words = text
          .toLowerCase()
          .split(/[\s,;:\n\r\t]+/)
          .map(word => word.trim())
          .filter(word => word.length > 0)
          .filter(word => !customWords.includes(word));

        if (words.length === 0) {
          alert('No new words found in the file');
          setUploading(false);
          setUploadProgress(0);
          return;
        }

        // Simulate progress
        setUploadProgress(50);

        // Add words to server with your exact API structure
        const response = await fetch(`/api/guild/${guildId}/words`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            words: words,
            type: 'custom'
          }),
        });

        setUploadProgress(90);

        const data = await response.json();
        if (data.success) {
          setCustomWords(prev => [...prev, ...words]);
          onUpdate();
          setUploadProgress(100);
          alert(`Successfully added ${words.length} words from file!`);
        } else {
          alert('Failed to add words: ' + data.error);
        }
      } catch (error) {
        alert('Error processing file');
        console.error(error);
      }
      
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
    };

    reader.readAsText(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const filteredWords = customWords.filter(word =>
    word.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Modern Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 rounded-2xl p-6 sm:p-8 border border-purple-100">
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
            Words Manager
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Manage custom words that will be blocked by the filter
          </p>
        </div>
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-purple-200 to-blue-200 rounded-full opacity-20 blur-xl"></div>
        <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-gradient-to-br from-indigo-200 to-pink-200 rounded-full opacity-20 blur-lg"></div>
      </div>

      {/* Add Single Word */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100/50">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <PlusIcon className="h-5 w-5 text-purple-600" />
            <span>Add Single Word</span>
          </h3>
        </div>
        <div className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                placeholder="Enter word to block..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-white hover:border-gray-300"
                onKeyPress={(e) => e.key === 'Enter' && addWord()}
                disabled={loading || uploading}
              />
            </div>
            <button
              onClick={addWord}
              disabled={loading || uploading || !newWord.trim()}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl hover:from-purple-600 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm hover:shadow-lg hover:scale-[1.02] flex items-center space-x-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <PlusIcon className="h-5 w-5" />
              )}
              <span>Add Word</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Operations */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100/50">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <CloudArrowUpIcon className="h-5 w-5 text-blue-600" />
            <span>Bulk Operations</span>
          </h3>
        </div>
        <div className="p-6 space-y-6">
          {/* File Upload */}
          <div className="relative">
            <input
              type="file"
              ref={fileInputRef}
              accept=".txt"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading || loading}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`
                flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200
                ${uploading 
                  ? 'border-blue-300 bg-blue-50' 
                  : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50 bg-gray-50'
                }
              `}
            >
              <CloudArrowUpIcon className={`h-12 w-12 mb-3 ${uploading ? 'text-blue-500' : 'text-gray-400'}`} />
              <span className="text-lg font-medium text-gray-700 mb-1">
                {uploading ? 'Processing...' : 'Upload a .txt file with blocked words'}
              </span>
              <span className="text-sm text-gray-500">
                Words can be separated by spaces, commas, semicolons, or new lines
              </span>
              
              {uploading && (
                <div className="w-full max-w-xs mt-4">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-500 mt-1 block text-center">
                    {uploadProgress}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Bulk Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Selected Count and Delete */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl flex-1">
              <span className="text-sm text-gray-600">
                {selectedWords.size} word{selectedWords.size !== 1 ? 's' : ''} selected
              </span>
              <button
                onClick={() => {
                  if (selectedWords.size === 0) {
                    alert('No words selected');
                    return;
                  }
                  if (confirm(`Delete ${selectedWords.size} selected word(s)?`)) {
                    removeWords(Array.from(selectedWords));
                  }
                }}
                disabled={selectedWords.size === 0 || loading || uploading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 hover:scale-[1.02]"
              >
                <TrashIcon className="h-4 w-4" />
                <span>Delete Selected</span>
              </button>
            </div>

            {/* NEW FEATURE - Clear All Button */}
            <button
              onClick={clearAllWords}
              disabled={customWords.length === 0 || loading || uploading}
              className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 hover:scale-[1.02] shadow-sm hover:shadow-lg"
            >
              <XMarkIcon className="h-6 w-6" />
              <span>Clear List ({customWords.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
        <div className="p-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search blocked words..."
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              disabled={loading || uploading}
            />
          </div>
        </div>
      </div>

      {/* Words List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100/50">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-3">
            <span>Blocked Words</span>
            <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-medium rounded-full">
              {filteredWords.length}
            </span>
          </h3>
        </div>
        
        {filteredWords.length > 0 ? (
          <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {filteredWords.map((word) => (
              <div
                key={word}
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-all duration-200 group"
              >
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedWords.has(word)}
                    onChange={() => toggleWordSelection(word)}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded transition-colors"
                    disabled={loading || uploading}
                  />
                  <ExclamationTriangleIconSolid className="h-5 w-5 text-red-500" />
                  <span className="font-medium text-gray-900">{word}</span>
                </div>
                <button
                  onClick={() => {
                    if (confirm(`Delete "${word}"?`)) {
                      removeWords([word]);
                    }
                  }}
                  disabled={loading || uploading}
                  className="opacity-0 group-hover:opacity-100 p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <ExclamationTriangleIconSolid className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h4 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm ? 'No words match your search' : 'No blocked words configured'}
            </h4>
            <p className="text-gray-600">
              {searchTerm 
                ? 'Try adjusting your search terms'
                : 'Add some blocked words to get started'
              }
            </p>
          </div>
        )}
      </div>

      {/* Loading Indicator */}
      {(loading || uploading) && (
        <div className="flex items-center justify-center space-x-2 text-blue-600 bg-blue-50 rounded-xl p-4">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
          <span className="font-medium">{loading ? 'Loading...' : 'Processing file...'}</span>
        </div>
      )}

      {/* Quick Stats */}
      {customWords.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.02] p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-purple-100 rounded-xl">
                <SparklesIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{customWords.length}</p>
                <p className="text-sm text-gray-600">Total Words</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.02] p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-100 rounded-xl">
                <CheckIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{selectedWords.size}</p>
                <p className="text-sm text-gray-600">Selected</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.02] p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-green-100 rounded-xl">
                <ExclamationTriangleIcon className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">Active</p>
                <p className="text-sm text-gray-600">Filter Status</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WordsManager;

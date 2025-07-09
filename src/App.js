
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus, Edit, Trash2, CheckCircle, Circle, ClipboardList, Filter, Search,
  ArrowUp, ArrowDown, Download, Sun, Moon, AlertTriangle, XCircle, Tag, Calendar, SlidersHorizontal, BookOpenText
} from 'lucide-react';

// Custom hook for localStorage persistence
const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
};

const AssignmentManager = () => {
  const [assignments, setAssignments] = useLocalStorage('studentAssignments', []);
  const [newAssignmentTitle, setNewAssignmentTitle] = useState('');
  const [newAssignmentCategory, setNewAssignmentCategory] = useState('');
  const [newAssignmentDueDate, setNewAssignmentDueDate] = useState('');
  const [newAssignmentPriority, setNewAssignmentPriority] = useState('medium'); // Default priority
  const [editingAssignmentId, setEditingAssignmentId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [titleError, setTitleError] = useState('');
  const [dueDateError, setDueDateError] = useState('');
  const [isDarkMode, setIsDarkMode] = useLocalStorage('darkMode', false);

  const availableCategories = useMemo(() => {
    const categories = new Set(assignments.map(a => a.category).filter(Boolean));
    return ['all', ...Array.from(categories).sort()];
  }, [assignments]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  const handleAddOrUpdateAssignment = useCallback((e) => {
    e.preventDefault();
    let valid = true;

    if (!newAssignmentTitle.trim()) {
      setTitleError('Title is required.');
      valid = false;
    } else {
      setTitleError('');
    }

    if (newAssignmentDueDate && new Date(newAssignmentDueDate) < new Date(new Date().setHours(0, 0, 0, 0))) {
      setDueDateError('Due date cannot be in the past.');
      valid = false;
    } else {
      setDueDateError('');
    }

    if (!valid) return;

    if (editingAssignmentId) {
      setAssignments(assignments.map(assign =>
        assign.id === editingAssignmentId
          ? {
              ...assign,
              title: newAssignmentTitle.trim(),
              category: newAssignmentCategory.trim(),
              dueDate: newAssignmentDueDate,
              priority: newAssignmentPriority
            }
          : assign
      ));
      setEditingAssignmentId(null);
    } else {
      const newAssignment = {
        id: Date.now(),
        title: newAssignmentTitle.trim(),
        completed: false,
        category: newAssignmentCategory.trim(),
        dueDate: newAssignmentDueDate,
        priority: newAssignmentPriority,
        createdAt: new Date().toISOString()
      };
      setAssignments([newAssignment, ...assignments]);
    }
    setNewAssignmentTitle('');
    setNewAssignmentCategory('');
    setNewAssignmentDueDate('');
    setNewAssignmentPriority('medium');
  }, [assignments, editingAssignmentId, newAssignmentTitle, newAssignmentCategory, newAssignmentDueDate, newAssignmentPriority, setAssignments]);

  const handleEditAssignment = useCallback((assignment) => {
    setEditingAssignmentId(assignment.id);
    setNewAssignmentTitle(assignment.title);
    setNewAssignmentCategory(assignment.category);
    setNewAssignmentDueDate(assignment.dueDate);
    setNewAssignmentPriority(assignment.priority);
  }, []);

  const handleDeleteAssignment = useCallback((id) => {
    setAssignments(assignments.filter(assign => assign.id !== id));
    if (editingAssignmentId === id) {
      setEditingAssignmentId(null);
      setNewAssignmentTitle('');
      setNewAssignmentCategory('');
      setNewAssignmentDueDate('');
      setNewAssignmentPriority('medium');
    }
  }, [assignments, editingAssignmentId, setAssignments]);

  const handleToggleComplete = useCallback((id) => {
    setAssignments(assignments.map(assign =>
      assign.id === id ? { ...assign, completed: !assign.completed } : assign
    ));
  }, [assignments, setAssignments]);

  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setFilterCategory('all');
    setFilterStatus('all');
    setFilterPriority('all');
  }, []);

  const handleBulkDeleteCompleted = useCallback(() => {
    setAssignments(assignments.filter(assign => !assign.completed));
  }, [assignments, setAssignments]);

  const handleExportAssignments = useCallback(() => {
    if (assignments.length === 0) {
      alert("No assignments to export!");
      return;
    }
    const headers = ["Title", "Category", "Due Date", "Priority", "Completed", "Created At"];
    const csvRows = assignments.map(assignment => [
      `"${assignment.title.replace(/"/g, '""')}"`,
      `"${assignment.category ? assignment.category.replace(/"/g, '""') : ''}"`,
      assignment.dueDate || '',
      assignment.priority,
      assignment.completed ? 'Yes' : 'No',
      assignment.createdAt
    ].join(','));

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'assignments.csv');
    link.click();
    URL.revokeObjectURL(url);
  }, [assignments]);

  const moveAssignment = useCallback((id, direction) => {
    setAssignments(prevAssignments => {
      const index = prevAssignments.findIndex(a => a.id === id);
      if (index === -1) return prevAssignments;

      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prevAssignments.length) return prevAssignments;

      const newArr = [...prevAssignments];
      const [movedItem] = newArr.splice(index, 1);
      newArr.splice(newIndex, 0, movedItem);
      return newArr;
    });
  }, [setAssignments]);

  const filteredAndSortedAssignments = useMemo(() => {
    let filtered = assignments;

    if (searchTerm) {
      filtered = filtered.filter(assign =>
        assign.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterCategory !== 'all') {
      filtered = filtered.filter(assign => assign.category === filterCategory);
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(assign =>
        filterStatus === 'completed' ? assign.completed : !assign.completed
      );
    }

    if (filterPriority !== 'all') {
      filtered = filtered.filter(assign => assign.priority === filterPriority);
    }

    // Sort by due date (closest first), then by priority (high to low), then completed (uncompleted first)
    return [...filtered].sort((a, b) => {
      // Uncompleted tasks first
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }

      // Priority sort (High > Medium > Low)
      const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      // Due date sort
      const dateA = a.dueDate ? new Date(a.dueDate) : null;
      const dateB = b.dueDate ? new Date(b.dueDate) : null;

      if (dateA && dateB) {
        return dateA.getTime() - dateB.getTime();
      }
      if (dateA) return -1; // Assignments with due dates come before those without
      if (dateB) return 1;
      return 0; // No due dates, maintain original order
    });
  }, [assignments, searchTerm, filterCategory, filterStatus, filterPriority]);

  const totalAssignments = assignments.length;
  const pendingAssignments = assignments.filter(a => !a.completed).length;
  const completedAssignments = assignments.filter(a => a.completed).length;

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-rose-500';
      case 'medium': return 'bg-indigo-500';
      case 'low': return 'bg-emerald-500';
      default: return 'bg-gray-400';
    }
  };

  const getPriorityText = (priority) => {
    switch (priority) {
      case 'high': return 'High';
      case 'medium': return 'Medium';
      case 'low': return 'Low';
      default: return 'N/A';
    }
  };

  const isOverdue = useCallback((dueDate, completed) => {
    if (completed || !dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  }, []);

  return (
    <div className={`min-h-screen p-4 sm:p-6 md:p-8 font-sans ${isDarkMode ? 'dark bg-slate-900 text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
      <header className="flex flex-col sm:flex-row justify-between items-center mb-8 pb-4 border-b border-slate-200 dark:border-slate-700">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-indigo-600 dark:text-indigo-400 mb-4 sm:mb-0">
          Student Assignment Hub
        </h1>
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="p-2 rounded-full text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-slate-700 transition-colors duration-200"
          aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
        </button>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Assignment Form & Stats */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg transition-colors duration-200">
          <h2 className="text-2xl font-bold text-indigo-700 dark:text-indigo-300 mb-6 flex items-center">
            <ClipboardList size={24} className="mr-3" />
            {editingAssignmentId ? 'Edit Assignment' : 'Add New Assignment'}
          </h2>
          <form onSubmit={handleAddOrUpdateAssignment} className="space-y-4">
            <div>
              <label htmlFor="assignmentTitle" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Assignment Title
              </label>
              <input
                type="text"
                id="assignmentTitle"
                value={newAssignmentTitle}
                onChange={(e) => { setNewAssignmentTitle(e.target.value); setTitleError(''); }}
                placeholder="e.g., Calculus Homework Chapter 5"
                className={`w-full p-3 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 ${titleError ? 'border-rose-500 dark:border-rose-400' : 'border-slate-300 dark:border-slate-600'}`}
                aria-invalid={titleError ? "true" : "false"}
                aria-describedby={titleError ? "title-error" : undefined}
              />
              {titleError && (
                <p id="title-error" className="text-rose-500 text-sm mt-1 flex items-center">
                  <XCircle size={16} className="mr-1" />{titleError}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="assignmentCategory" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Category (e.g., Class, Subject)
              </label>
              <input
                type="text"
                id="assignmentCategory"
                value={newAssignmentCategory}
                onChange={(e) => setNewAssignmentCategory(e.target.value)}
                placeholder="e.g., Math, History, Essay"
                className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:text-slate-200"
              />
            </div>

            <div>
              <label htmlFor="assignmentDueDate" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Due Date
              </label>
              <input
                type="date"
                id="assignmentDueDate"
                value={newAssignmentDueDate}
                onChange={(e) => { setNewAssignmentDueDate(e.target.value); setDueDateError(''); }}
                className={`w-full p-3 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 ${dueDateError ? 'border-rose-500 dark:border-rose-400' : 'border-slate-300 dark:border-slate-600'}`}
                aria-invalid={dueDateError ? "true" : "false"}
                aria-describedby={dueDateError ? "due-date-error" : undefined}
              />
              {dueDateError && (
                <p id="due-date-error" className="text-rose-500 text-sm mt-1 flex items-center">
                  <XCircle size={16} className="mr-1" />{dueDateError}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="assignmentPriority" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Priority
              </label>
              <select
                id="assignmentPriority"
                value={newAssignmentPriority}
                onChange={(e) => setNewAssignmentPriority(e.target.value)}
                className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:text-slate-200"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 text-white p-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors duration-200 flex items-center justify-center shadow-md"
            >
              {editingAssignmentId ? <Edit size={20} className="mr-2" /> : <Plus size={20} className="mr-2" />}
              {editingAssignmentId ? 'Update Assignment' : 'Add Assignment'}
            </button>
            {editingAssignmentId && (
              <button
                type="button"
                onClick={() => {
                  setEditingAssignmentId(null);
                  setNewAssignmentTitle('');
                  setNewAssignmentCategory('');
                  setNewAssignmentDueDate('');
                  setNewAssignmentPriority('medium');
                  setTitleError('');
                  setDueDateError('');
                }}
                className="w-full mt-2 bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 p-3 rounded-lg font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors duration-200 shadow-md"
              >
                Cancel Edit
              </button>
            )}
          </form>

          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
            <h3 className="text-xl font-bold text-indigo-700 dark:text-indigo-300 mb-4 flex items-center">
              <BookOpenText size={20} className="mr-2" />Productivity Dashboard
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="bg-slate-100 dark:bg-slate-700 p-4 rounded-lg shadow-sm">
                <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{totalAssignments}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Total</p>
              </div>
              <div className="bg-slate-100 dark:bg-slate-700 p-4 rounded-lg shadow-sm">
                <p className="text-3xl font-bold text-rose-500">{pendingAssignments}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Pending</p>
              </div>
              <div className="bg-slate-100 dark:bg-slate-700 p-4 rounded-lg shadow-sm">
                <p className="text-3xl font-bold text-emerald-500">{completedAssignments}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Completed</p>
              </div>
            </div>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleBulkDeleteCompleted}
                disabled={completedAssignments === 0}
                className="flex-1 bg-rose-500 text-white p-3 rounded-lg font-semibold hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center shadow-md"
                aria-label="Delete all completed assignments"
              >
                <Trash2 size={20} className="mr-2" /> Delete Completed
              </button>
              <button
                onClick={handleExportAssignments}
                className="flex-1 bg-emerald-600 text-white p-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors duration-200 flex items-center justify-center shadow-md"
                aria-label="Export assignments to CSV"
              >
                <Download size={20} className="mr-2" /> Export to CSV
              </button>
            </div>
          </div>
        </div>

        {/* Assignment List */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg transition-colors duration-200">
          <h2 className="text-2xl font-bold text-indigo-700 dark:text-indigo-300 mb-6 flex items-center">
            <Filter size={24} className="mr-3" /> All Assignments
          </h2>

          {/* Filters */}
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search assignments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-3 pl-10 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:text-slate-200"
                aria-label="Search assignments"
              />
              <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            </div>

            <div className="relative">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full p-3 pl-10 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 appearance-none dark:bg-slate-700 dark:text-slate-200"
                aria-label="Filter by category"
              >
                <option value="all">All Categories</option>
                {availableCategories.filter(cat => cat !== 'all').map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <Tag size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full p-3 pl-10 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 appearance-none dark:bg-slate-700 dark:text-slate-200"
                aria-label="Filter by status"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
              </select>
              <CheckCircle size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="w-full p-3 pl-10 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 appearance-none dark:bg-slate-700 dark:text-slate-200"
                aria-label="Filter by priority"
              >
                <option value="all">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <SlidersHorizontal size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
            </div>

            {(searchTerm !== '' || filterCategory !== 'all' || filterStatus !== 'all' || filterPriority !== 'all') && (
              <button
                onClick={handleClearFilters}
                className="col-span-full md:col-span-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 p-3 rounded-lg font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors duration-200 shadow-sm"
                aria-label="Clear all filters"
              >
                Clear Filters
              </button>
            )}
          </div>

          {filteredAndSortedAssignments.length === 0 ? (
            <div className="text-center py-10 text-slate-500 dark:text-slate-400">
              <AlertTriangle size={48} className="mx-auto mb-4" />
              <p className="text-xl font-semibold">No assignments found!</p>
              <p className="text-md">Try adjusting your filters or add a new assignment.</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {filteredAndSortedAssignments.map((assignment, index) => (
                <li
                  key={assignment.id}
                  className={`flex flex-col sm:flex-row items-start sm:items-center p-4 rounded-lg shadow-md transition-all duration-300 ease-in-out
                    ${assignment.completed ? 'bg-emerald-50 dark:bg-emerald-900/40' : 'bg-slate-100 dark:bg-slate-700'}
                    ${isOverdue(assignment.dueDate, assignment.completed) ? 'ring-2 ring-rose-500 dark:ring-rose-400' : ''}
                    hover:shadow-lg transform hover:-translate-y-1
                  `}
                  aria-labelledby={`assignment-title-${assignment.id}`}
                  aria-describedby={`assignment-details-${assignment.id}`}
                >
                  <button
                    onClick={() => handleToggleComplete(assignment.id)}
                    className={`flex-shrink-0 p-1 rounded-full border-2 transition-all duration-200
                      ${assignment.completed
                        ? 'border-emerald-500 text-emerald-500 hover:bg-emerald-100 dark:hover:bg-emerald-800'
                        : 'border-slate-400 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'}
                    `}
                    aria-label={assignment.completed ? `Mark "${assignment.title}" as incomplete` : `Mark "${assignment.title}" as complete`}
                  >
                    {assignment.completed ? <CheckCircle size={24} fill="currentColor" /> : <Circle size={24} />}
                  </button>

                  <div className="flex-grow ml-4 mt-2 sm:mt-0">
                    <p
                      id={`assignment-title-${assignment.id}`}
                      className={`text-lg font-semibold ${assignment.completed ? 'line-through text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}
                    >
                      {assignment.title}
                    </p>
                    <div id={`assignment-details-${assignment.id}`} className="text-sm text-slate-600 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                      {assignment.category && (
                        <span className="flex items-center bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full text-xs font-medium">
                          <Tag size={12} className="mr-1" />{assignment.category}
                        </span>
                      )}
                      {assignment.dueDate && (
                        <span className={`flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                          ${isOverdue(assignment.dueDate, assignment.completed)
                            ? 'bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300'
                            : 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <Calendar size={12} className="mr-1" />Due: {new Date(assignment.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          {isOverdue(assignment.dueDate, assignment.completed) && <span className="ml-1 font-bold">(Overdue)</span>}
                        </span>
                      )}
                      <span className={`flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white ${getPriorityColor(assignment.priority)}`}>
                        <SlidersHorizontal size={12} className="mr-1" />{getPriorityText(assignment.priority)}
                      </span>
                    </div>
                  </div>

                  <div className="flex-shrink-0 flex gap-2 ml-auto mt-4 sm:mt-0">
                    <button
                      onClick={() => moveAssignment(assignment.id, 'up')}
                      disabled={index === 0}
                      className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-200"
                      aria-label={`Move "${assignment.title}" up`}
                    >
                      <ArrowUp size={20} />
                    </button>
                    <button
                      onClick={() => moveAssignment(assignment.id, 'down')}
                      disabled={index === filteredAndSortedAssignments.length - 1}
                      className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-200"
                      aria-label={`Move "${assignment.title}" down`}
                    >
                      <ArrowDown size={20} />
                    </button>
                    <button
                      onClick={() => handleEditAssignment(assignment)}
                      className="p-2 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-slate-700 transition-colors duration-200"
                      aria-label={`Edit "${assignment.title}"`}
                    >
                      <Edit size={20} />
                    </button>
                    <button
                      onClick={() => handleDeleteAssignment(assignment.id)}
                      className="p-2 rounded-lg text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900 transition-colors duration-200"
                      aria-label={`Delete "${assignment.title}"`}
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
};

export default AssignmentManager;

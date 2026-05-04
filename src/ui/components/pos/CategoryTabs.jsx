import React from 'react';

const CategoryTabs = ({ categories, selectedCategory, onSelectCategory }) => {
  return (
    <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar">
      <button 
        onClick={() => onSelectCategory(null)}
        className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.15em] transition-all whitespace-nowrap shadow-sm active:scale-95 border ${
          selectedCategory === null 
            ? 'bg-primary-900 text-white border-primary-900 shadow-lg shadow-primary-900/20' 
            : 'bg-white text-primary-600 border-primary-200 hover:border-primary-400'
        }`}
      >
        Todos
      </button>

      <button 
        onClick={() => onSelectCategory('menu_dia')}
        className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.15em] transition-all whitespace-nowrap shadow-sm active:scale-95 border ${
          selectedCategory === 'menu_dia' 
            ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20' 
            : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 hover:border-amber-300'
        }`}
      >
        Menú Día
      </button>

      {categories.map(cat => (
        <button 
          key={cat.id}
          onClick={() => onSelectCategory(cat.id)}
          className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.15em] transition-all whitespace-nowrap shadow-sm active:scale-95 border ${
            selectedCategory === cat.id 
              ? 'bg-brand text-white border-brand shadow-lg shadow-brand/20' 
              : 'bg-white text-primary-600 border-primary-200 hover:border-primary-400'
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
};

export default CategoryTabs;

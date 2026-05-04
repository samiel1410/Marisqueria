import React from 'react';

const ProductCard = ({ product, getImageUrl, onAddToCart }) => {
  const imageUrl = getImageUrl(product.image_path);
  
  return (
    <div 
      onClick={() => onAddToCart(product)}
      className="bg-white rounded-2xl p-2.5 shadow-sm border border-primary-100 hover:shadow-xl hover:shadow-brand/5 hover:border-brand/40 transition-all group cursor-pointer active:scale-95 flex flex-col h-full"
    >
      <div className="relative aspect-square rounded-xl overflow-hidden bg-primary-50 mb-2.5 shrink-0 border border-primary-50">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={product.name} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-primary-300">
            <span className="text-[8px] font-black uppercase tracking-widest">Sin Imagen</span>
          </div>
        )}
        <div className="absolute top-1.5 right-1.5 bg-white shadow-md px-2 py-1 rounded-lg border border-primary-50">
          <span className="text-xs font-black text-brand">${parseFloat(product.price).toFixed(2)}</span>
        </div>
      </div>
      <div className="flex-1 flex flex-col justify-between">
        <h4 className="text-[11px] font-black text-primary-900 line-clamp-2 leading-tight group-hover:text-brand transition-colors uppercase tracking-tight">
          {product.name}
        </h4>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[9px] font-bold text-primary-500 uppercase tracking-widest">
            Stock: {product.stock || 0}
          </span>
          <div className="w-6 h-6 rounded-lg bg-primary-50 flex items-center justify-center text-primary-400 group-hover:bg-brand group-hover:text-white transition-all shadow-sm">
            <span className="text-lg font-light">+</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;

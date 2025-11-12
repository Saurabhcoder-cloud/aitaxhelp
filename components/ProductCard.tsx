'use client';

interface Product {
  id: number;
  name: string;
  image: string;
  category: string;
}

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const handleEnquiry = () => {
    // This would open an enquiry modal or redirect to enquiry page
    console.log(`Enquiry for product: ${product.name}`);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow overflow-hidden group">
      <div className="relative overflow-hidden">
        <img 
          src={product.image}
          alt={product.name}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      </div>
      
      <div className="p-6 text-center">
        <h3 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h3>
        <p className="text-gray-600 text-sm mb-4">{product.category}</p>
        <button
          onClick={handleEnquiry}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer"
        >
          Enquiry
        </button>
      </div>
    </div>
  );
}
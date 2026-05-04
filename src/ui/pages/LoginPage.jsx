import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UtensilsCrossed, Waves, Shell, Fish } from 'lucide-react';
import api from '../../infrastructure/api';
import { isSessionValid } from '../../infrastructure/api';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // If already logged in with a valid session, skip login
  React.useEffect(() => {
    if (isSessionValid()) navigate('/dashboard', { replace: true });
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const response = await api.post('/login', { username, password });
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        navigate('/dashboard');
      }
    } catch (err) {
      if (err.response) {
        const errorMessage = err.response.data?.error || err.response.data?.message;
        if (err.response.status === 401) {
          setError('Usuario o contraseña incorrectos. Por favor, verifica tus datos.');
        } else if (errorMessage) {
          setError(errorMessage);
        } else {
          setError('Error en el servidor. Inténtalo más tarde.');
        }
      } else if (err.request) {
        setError('No se pudo conectar con el servidor. Verifica tu conexión a internet.');
      } else {
        setError('Ocurrió un error al intentar iniciar sesión.');
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Image/Branding */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative bg-primary-900 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900 via-primary-800 to-brand-dark"></div>
        
        {/* Decorative Elements */}
        <div className="absolute top-20 left-20 w-32 h-32 border border-brand/20 rounded-full animate-pulse-soft"></div>
        <div className="absolute top-40 right-40 w-48 h-48 border border-brand/10 rounded-full"></div>
        <div className="absolute bottom-20 left-40 w-24 h-24 bg-brand/5 rounded-full blur-xl"></div>
        <div className="absolute bottom-40 right-20 w-64 h-64 bg-brand/10 rounded-full blur-3xl"></div>

        {/* Waves SVG Pattern */}
        <div className="absolute bottom-0 left-0 right-0 h-48 opacity-20">
          <svg viewBox="0 0 1440 320" className="w-full h-full" preserveAspectRatio="none">
            <path fill="#0ea5e9" fillOpacity="1" d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,112C672,96,768,96,864,112C960,128,1056,160,1152,160C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16 xl:px-24">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-brand/20 rounded-2xl">
                <UtensilsCrossed className="w-12 h-12 text-brand" />
              </div>
              <span className="text-2xl font-display font-bold text-white">Krustacio Kascarudo POS</span>
            </div>
            
            <h1 className="text-5xl xl:text-6xl font-display font-bold text-white leading-tight mb-6">
              Gestiona tu<br />
              <span className="text-brand">negocio</span> con<br />
              estilo
            </h1>
            
            <p className="text-xl text-primary-300 max-w-md leading-relaxed">
              Sistema completo para gestionar pedidos, inventario y ventas de tu restaurante de mariscos.
            </p>
          </div>

          {/* Feature Pills */}
          <div className="flex flex-wrap gap-3 mt-8">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-white/90 text-sm">
              <Fish className="w-4 h-4 text-brand" />
              <span>Gestión de Pedidos</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-white/90 text-sm">
              <Shell className="w-4 h-4 text-brand" />
              <span>Control de Inventario</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-white/90 text-sm">
              <Waves className="w-4 h-4 text-brand" />
              <span>Reportes en Tiempo Real</span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-12 mt-16">
            <div>
              <p className="text-3xl font-display font-bold text-white">500+</p>
              <p className="text-sm text-primary-400">Restaurantes</p>
            </div>
            <div>
              <p className="text-3xl font-display font-bold text-white">99.9%</p>
              <p className="text-sm text-primary-400">Uptime</p>
            </div>
            <div>
              <p className="text-3xl font-display font-bold text-white">24/7</p>
              <p className="text-sm text-primary-400">Soporte</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center bg-primary-50 p-8 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="p-3 bg-brand/10 rounded-xl">
              <UtensilsCrossed className="w-8 h-8 text-brand" />
            </div>
            <span className="text-2xl font-display font-bold text-primary-900">Krustacio Kascarudo</span>
          </div>

          <div className="bg-white rounded-3xl shadow-soft p-8 lg:p-10">
            <div className="mb-8">
              <h2 className="text-3xl font-display font-bold text-primary-900 mb-2">
                Bienvenido de vuelta
              </h2>
              <p className="text-primary-500">
                Ingresa tus credenciales para acceder al panel
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div>
                <label className="block mb-2 text-sm font-semibold text-primary-700">
                  Usuario
                </label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl bg-primary-50 border-2 border-primary-200 text-primary-900 placeholder-primary-400 outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all duration-300"
                  placeholder="Ingresa tu usuario"
                  required
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-semibold text-primary-700">
                  Contraseña
                </label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl bg-primary-50 border-2 border-primary-200 text-primary-900 placeholder-primary-400 outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all duration-300"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="btn btn-brand w-full mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Iniciando sesión...
                  </span>
                ) : (
                  'Iniciar Sesión'
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-primary-100">
              <p className="text-sm text-center text-primary-400">
                Credenciales por defecto: <span className="text-primary-600 font-medium">admin / password</span>
              </p>
            </div>
          </div>

          <p className="mt-8 text-sm text-center text-primary-400">
            © 2026 Krustacio Kascarudo POS System. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

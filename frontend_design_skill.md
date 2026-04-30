# Frontend Design Skill - Marisquería POS

## 1. Filosofía de Diseño
El panel de administración web debe transmitir una sensación "Premium", limpia y moderna. No debe parecer una simple plantilla, sino un producto SaaS de alta calidad.

## 2. Paleta de Colores
- **Primary (Oscuro Elegante)**: `#0F172A` (Slate 900) - Usado para fondos principales, cabeceras y texto muy destacado.
- **Primary Light**: `#1E293B` (Slate 800) - Usado para tarjetas o secciones elevadas.
- **Accent (Agua/Mar)**: `#0EA5E9` (Sky 500) - Color de marca, botones principales, enlaces activos. Representa frescura (marisquería).
- **Background**: `#F8FAFC` (Slate 50) - Fondo general de la aplicación.
- **Surface**: `#FFFFFF` (White) - Fondos de tarjetas y contenedores.
- **Text Main**: `#334155` (Slate 700) - Texto principal de lectura.
- **Text Muted**: `#64748B` (Slate 500) - Texto secundario o descriptivo.

## 3. Tipografía
Se utilizan fuentes modernas de Google Fonts:
- **Títulos y Cabeceras**: `Outfit` (Pesos: 500, 600, 700). Da un toque moderno, geométrico y amable.
- **Cuerpo y Datos**: `Inter` (Pesos: 400, 500). Altamente legible para tablas de datos y paneles de control.

## 4. Elementos UI Clave (Glassmorphism & Depth)
- **Glassmorphism**: Úsalo para modales, barras laterales superpuestas o tarjetas destacadas.
  - CSS: `background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.4);`
- **Sombras (Shadows)**: Las sombras deben ser amplias y suaves, nunca duras.
  - Ejemplo: `box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05);`
- **Bordes Redondeados**:
  - Botones y campos de entrada: `border-radius: 0.75rem` (12px).
  - Tarjetas y Contenedores: `border-radius: 1.5rem` (24px).

## 5. Animaciones y Microinteracciones
- **Hover en Botones**: Ligeros desplazamientos hacia arriba (`transform: translateY(-2px)`) acompañados de un incremento en la opacidad de la sombra.
- **Entradas en Pantalla**: Uso de `fade-in` y movimientos de abajo hacia arriba al montar componentes de página.
- **Transiciones**: Todas las propiedades interactivas (background, color, transform) deben tener una transición suave: `transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);`

## 6. Estructura de Componentes
- Favorece diseños expansivos (Layout de Grid o Flexbox) con suficiente "espacio en blanco" (White Space).
- Las tablas de datos no deben tener bordes verticales, solo sutiles líneas divisorias horizontales, con filas que resalten ligeramente al pasar el cursor (hover).

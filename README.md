# 🎨 PIXELES - Documento de Diseño

## 1. Premisa Base
Juego de pixel art dinámico basado en desafíos rápidos, precisión y creatividad. No es solo colorear, es un reto arcade.

## 2. Mecánicas Jugables
### 2.1 Desafíos (Arcade Mode)
- **Speed Paint**: Colorear un sprite antes de que se acabe el tiempo.
- **Memory Pixel**: Se muestra un patrón por 3 segundos, debes replicarlo de memoria.
- **Rhythm Color**: Colorear siguiendo el beat de la música.
- **Precision**: No salirte de las líneas (un error = vida menos).

### 2.2 Variantes
- **Glitch Mode**: Si fallas, la pantalla se corrompe visualmente.
- **Hidden Zones**: Píxeles invisibles que se revelan al pasar el mouse/dedo.

## 3. Progresión (Roguelite)
- **Runs**: Intentar llegar lo más lejos posible en una serie de niveles aleatorios.
- **Power-ups**:
  - *Time Freeze*: Detiene el tiempo 5s.
  - *Auto-Fill*: Rellena un área pequeña automáticamente.
  - *X-Ray*: Muestra el modelo original superpuesto por unos segundos.

## 4. Modo Creativo
- Lienzo libre (16x16, 32x32, 64x64).
- Herramientas: Lápiz, Cubo, Borrador, Pipeta.
- Exportación: PNG, GIF.

## 5. Estética
- **Visual**: Neon, Dark UI, Glitch effects, CRT scanlines.
- **Audio**: Chiptune rápido, SFX de 8-bit.

## 6. Stack Tecnológico
- HTML5 Canvas
- CSS3 (Animaciones Glitch)
- JavaScript (Vanilla)

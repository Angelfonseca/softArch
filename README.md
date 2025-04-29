# SoftArch - Generador de Arquitecturas de Software con IA

![SoftArch Logo](https://via.placeholder.com/150?text=SoftArch)

## 📋 Descripción

SoftArch es un generador de arquitecturas de software basado en Inteligencia Artificial (DeepSeek) que permite diseñar y crear rápidamente proyectos de backend con una estructura optimizada basada en descripción en lenguaje natural. La herramienta es capaz de generar toda la estructura de carpetas y archivos necesarios para una API, incluyendo modelos, controladores, rutas y configuraciones.

## ✨ Características

- **Generación de arquitectura completa** a partir de descripciones en lenguaje natural
- **Vista previa de la arquitectura** antes de la generación final
- **Recomendaciones inteligentes** basadas en el tipo de proyecto y requisitos
- **Múltiples opciones de personalización**: base de datos, framework, autenticación, etc.
- **Guardado de configuraciones** para generación posterior
- **Soporte para GraphQL** integrado
- **Consultas globales** para administradores
- **Integración con WebSockets** (opcional)

## 🚀 Instalación

### Requisitos previos

- Node.js (versión 14 o superior)
- npm o yarn

### Instalación global (recomendado)

```bash
npm install -g softarch
```

### Instalación local

```bash
git clone https://github.com/tu-usuario/softArch.git
cd softArch
npm install
npm link
```

## 🛠️ Uso

SoftArch ofrece múltiples comandos para diferentes necesidades:

### Vista Previa y Generación

```bash
softarch preview "API para gestión de inventario" --name inventario-api
```

Este comando muestra una vista previa de la arquitectura recomendada y permite ajustarla antes de generar el proyecto. Durante la vista previa podrás:

- Ver la estructura de carpetas y archivos principales
- Obtener recomendaciones de configuración
- Modificar opciones como base de datos, framework y autenticación
- Generar el proyecto después de revisar la vista previa

### Opciones del comando preview

```
--name, -n       Nombre del proyecto (defecto: 'proyecto-api')
--database, -d   Base de datos a utilizar (MongoDB, PostgreSQL, MySQL, etc.)
--framework, -f  Framework para el backend (Express, Koa, Fastify, etc.)
--auth, -a       Método de autenticación (JWT, OAuth2, API Key, etc.)
--graphql        Incluir soporte para GraphQL
--no-graphql     No incluir soporte para GraphQL
--output, -o     Ruta de salida para el proyecto
--save           Guardar la configuración para uso futuro
--generate       Generar el proyecto después de mostrar la vista previa
```

### Generar Backend Directamente

```bash
softarch backend "API REST para gestión de clientes y productos" --database MongoDB --framework Express
```

Este comando genera un backend completo sin mostrar vista previa.

### Generar API GraphQL

```bash
softarch graphql "API para blog con usuarios y posts" --database MongoDB
```

Genera una API GraphQL basada en la descripción.

### Guardar Configuración de Proyecto

```bash
softarch save "API para gestión de inventario" --name inventario-api --database MongoDB --framework Express
```

Guarda la configuración para generar el proyecto más adelante.

### Listar Proyectos Guardados

```bash
softarch list-saved
```

Muestra todos los proyectos cuyas configuraciones han sido guardadas.

### Generar Proyecto Desde Configuración Guardada

```bash
softarch generate-saved inventario-api
```

Genera un proyecto usando una configuración guardada previamente.

### Otros Comandos

- `softarch generate`: Genera la estructura básica de un proyecto
- `softarch webhook`: Crea un webhook para un servicio específico
- `softarch process`: Procesa una solicitud en lenguaje natural
- `softarch create`: Genera un proyecto completo con todas las opciones

## 📁 Estructura del Proyecto Generado

La estructura del proyecto generado típicamente incluye:

```
proyecto-api/
├── src/
│   ├── config/        # Configuraciones (base de datos, variables de entorno, etc.)
│   ├── controllers/   # Controladores para manejar la lógica de negocio
│   ├── middlewares/   # Middlewares (autenticación, validación, etc.)
│   ├── models/        # Modelos de datos / esquemas
│   ├── routes/        # Rutas de la API
│   ├── services/      # Servicios y lógica de negocio
│   └── utils/         # Utilidades y funciones helper
├── app.js             # Archivo principal de la aplicación
├── package.json       # Dependencias y scripts
├── .env.example       # Ejemplo de variables de entorno
└── README.md          # Documentación e instrucciones
```

## 📝 Ejemplos de Uso

### Ejemplo 1: API para gestión de tareas con MongoDB y Express

```bash
softarch preview "API de gestión de tareas con usuarios, proyectos y tareas. Cada tarea pertenece a un proyecto y tiene un usuario asignado. Incluir autenticación y roles" --name task-manager
```

### Ejemplo 2: API para tienda online con PostgreSQL

```bash
softarch backend "API para tienda online con catálogo de productos, carrito de compra, órdenes y usuarios" --database PostgreSQL --framework Express --auth JWT
```

### Ejemplo 3: API GraphQL para blog

```bash
softarch graphql "Blog con usuarios, posts, comentarios y categorías. Autenticación con JWT y roles de usuario" --name graphql-blog
```

### Ejemplo 4: Guardar y generar posteriormente

```bash
# Guardar configuración
softarch save "Sistema de reservas hoteleras con habitaciones, clientes y reservas" --name hotel-system --database MongoDB

# Generar más tarde
softarch generate-saved hotel-system --output ./proyectos
```

## ⚙️ Personalización de Plantillas

SoftArch utiliza plantillas Handlebars para generar el código. Si deseas personalizar las plantillas:

1. Navega a la carpeta `src/templates/hbs/`
2. Modifica las plantillas según tus necesidades
3. Las plantillas están organizadas por tipo:
   - `backend/`: Plantillas para backend tradicional REST
   - `graphql/`: Plantillas para APIs GraphQL

## 🧩 Flujo de Trabajo Recomendado

1. Genera una vista previa con `softarch preview "descripción del proyecto"`
2. Revisa las recomendaciones y ajusta según sea necesario
3. Guarda la configuración con `--save` si planeas reutilizarla
4. Genera el proyecto final
5. Personaliza el proyecto generado según necesidades específicas

## ❓ Resolución de Problemas

### Error: TypeError: this._getFileTypeFromPath is not a function

Este error ocurría al generar un proyecto. Ha sido corregido en la última versión. Si sigues experimentándolo, actualiza SoftArch a la última versión.

### Error al generar proyectos con consulta global

Asegúrate de que la plantilla `globalQuery.hbs` existe en la carpeta de plantillas y tiene el contenido correcto.

### Problemas con las dependencias

Si experimentas problemas con las dependencias, ejecuta:

```bash
npm install --force
```

## 🔄 Actualización

Para actualizar SoftArch a la última versión:

```bash
npm update -g softarch
```

## 🤝 Contribución

Las contribuciones son bienvenidas. Para contribuir:

1. Haz un fork del proyecto
2. Crea una rama para tu característica (`git checkout -b feature/amazing-feature`)
3. Haz commit de tus cambios (`git commit -m 'Añadir característica'`)
4. Haz push a la rama (`git push origin feature/amazing-feature`)
5. Abre un Pull Request

## 📜 Licencia

Este proyecto está licenciado bajo la Licencia ISC - ver el archivo LICENSE para más detalles.

## 📧 Contacto

Si tienes preguntas o sugerencias, no dudes en abrir un issue en el repositorio del proyecto.

---

Desarrollado con ❤️ utilizando Node.js y DeepSeek AI
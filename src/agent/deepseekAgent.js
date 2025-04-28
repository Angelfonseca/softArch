/**
 * Agente de IA basado en Deepseek para la generación de arquitecturas
 * usando la librería de OpenAI para conectar con la API de Deepseek
 */
const config = require('../config/deepseek');
const OpenAI = require('openai');
const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');

class DeepseekAgent {
  constructor() {
    this.client = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: config.apiKey || process.env.DEEPSEEK_API_KEY
    });
    
    // Cache para almacenar plantillas CRUD y otros contenidos reutilizables
    this.codeCache = new Map();
  }

  /**
   * Genera una arquitectura de software basada en una descripción
   * @param {string} description - Descripción del proyecto
   * @returns {Object} Estructura de carpetas y archivos recomendada
   */
  async generateArchitecture(description) {
    const prompt = `
      Actúa como un arquitecto de software experto. Basándote en la siguiente descripción, 
      genera una estructura de carpetas y archivos optimizada para un proyecto de backend usando Node.js.
      Incluye una breve descripción de cada archivo y carpeta.
      
      Consideraciones importantes:
      - Estructura modular y organizada (MVC o similar).
      - Solo incluye archivos realmente necesarios según la descripción.
      - Evita archivos redundantes o que pueden generarse con plantillas estándar.
      - Marca los archivos que podrían usar plantillas estándar con la propiedad "useTemplate":true.
      
      Descripción del proyecto: ${description}
      
      Responde con un objeto JSON con la siguiente estructura:
      {
        "folders": [
          {
            "path": "ruta/de/la/carpeta",
            "description": "Descripción de la carpeta"
          }
        ],
        "files": [
          {
            "path": "ruta/del/archivo",
            "description": "Descripción del archivo",
            "useTemplate": true|false,
            "templateType": "model|controller|route|middleware|config" (opcional)
          }
        ]
      }
    `;

    try {
      console.log('🧠 Generando arquitectura optimizada...');
      
      const response = await this.client.chat.completions.create({
        messages: [
          { role: "system", content: "Eres un arquitecto de software experto que genera estructuras de proyectos eficientes y optimizadas." },
          { role: "user", content: prompt }
        ],
        model: "deepseek-chat",
        temperature: 0.2, // Temperatura más baja para respuestas más consistentes
        max_tokens: config.maxTokens
      });
      
      // Extraer el JSON de la respuesta
      const responseText = response.choices[0].message.content;
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No se pudo extraer el JSON de la respuesta');
      }
      
      const architecture = JSON.parse(jsonMatch[0]);
      
      // Agregar información adicional de optimización
      architecture.optimizationInfo = {
        totalFolders: architecture.folders.length,
        totalFiles: architecture.files.length,
        templatedFiles: architecture.files.filter(f => f.useTemplate).length,
        customFiles: architecture.files.filter(f => !f.useTemplate).length
      };
      
      return architecture;
    } catch (error) {
      console.error('Error al generar arquitectura:', error);
      throw error;
    }
  }

  /**
   * Genera código para un archivo basado en la descripción y el contexto
   * @param {string} filePath - Ruta del archivo a generar
   * @param {string} description - Descripción del archivo
   * @param {Object} context - Contexto del proyecto
   * @returns {string} Código generado
   */
  async generateCode(filePath, description, context) {
    const fileExtension = filePath.split('.').pop();
    const fileName = path.basename(filePath);
    
    // Verificar si el archivo es genérico y podemos usar una plantilla en caché
    const cacheKey = this._getCacheKey(filePath, context);
    if (this.codeCache.has(cacheKey)) {
      console.log(`📋 Usando código en caché para ${filePath}`);
      return this.codeCache.get(cacheKey);
    }
    
    // Personalizar el prompt según el tipo de archivo
    let specializedPrompt = '';
    if (fileExtension === 'js' || fileExtension === 'ts') {
      if (filePath.includes('/models/')) {
        specializedPrompt = this._getModelPrompt(filePath, description, context);
      } else if (filePath.includes('/controllers/')) {
        specializedPrompt = this._getControllerPrompt(filePath, description, context);
      } else if (filePath.includes('/routes/')) {
        specializedPrompt = this._getRoutePrompt(filePath, description, context);
      } else if (filePath.includes('/middleware/')) {
        specializedPrompt = this._getMiddlewarePrompt(filePath, description, context);
      } else if (filePath.includes('/config/')) {
        specializedPrompt = this._getConfigPrompt(filePath, description, context);
      }
    }
    
    // Si no hay un prompt especializado, usar el genérico
    const prompt = specializedPrompt || `
      Actúa como un desarrollador senior de ${context.language || 'JavaScript'}.
      Necesito que generes código eficiente y optimizado para un archivo con la siguiente información:
      
      Ruta del archivo: ${filePath}
      Descripción: ${description}
      
      Consideraciones importantes:
      - El código debe ser conciso y seguir las mejores prácticas.
      - Incluye solo lo esencial según la descripción.
      - Usa dependencias estándar del ecosistema.
      - No incluyas funcionalidades innecesarias.
      - NO INCLUYAS DELIMITADORES DE MARKDOWN como \`\`\`javascript o similares.
      - Genera únicamente código fuente válido que pueda ser ejecutado directamente.
      
      Contexto relevante del proyecto: ${JSON.stringify({
        projectName: context.projectName || 'api',
        description: context.description,
        database: context.database || 'MongoDB',
        framework: context.framework || 'Express'
      })}
      
      Genera solo el código para este archivo, sin comentarios adicionales ni delimitadores Markdown.
    `;

    try {
      console.log(`🔄 Generando código optimizado para ${filePath}...`);
      
      const response = await this.client.chat.completions.create({
        messages: [
          { role: "system", content: `Eres un desarrollador senior experto en ${context.language || 'JavaScript'} que escribe código eficiente y optimizado. No incluyas delimitadores de Markdown en tu código. Genera únicamente código fuente válido.` },
          { role: "user", content: prompt }
        ],
        model: "deepseek-chat",
        temperature: 0.3, // Temperatura baja para código más consistente
        max_tokens: config.maxTokens
      });
      
      let code = response.choices[0].message.content.trim();
      
      // Limpiar cualquier delimitador de markdown del código
      code = this._cleanMarkdownDelimiters(code);
      
      // Guardar en caché si es un archivo que podría reutilizarse
      if (this._isCacheable(filePath)) {
        this.codeCache.set(cacheKey, code);
      }
      
      return code;
    } catch (error) {
      console.error('Error al generar código:', error);
      throw error;
    }
  }
  
  /**
   * Limpia delimitadores de markdown del código generado
   * @param {string} code - Código generado posiblemente con delimitadores markdown
   * @returns {string} - Código limpio
   * @private
   */
  _cleanMarkdownDelimiters(code) {
    // Eliminar bloques de código markdown (```language ... ```)
    let cleaned = code.replace(/^```[\w]*\n/m, '');
    cleaned = cleaned.replace(/\n```$/m, '');
    
    // Eliminar también cualquier bloque de código que pueda estar en medio
    cleaned = cleaned.replace(/```[\w]*\n/gm, '');
    cleaned = cleaned.replace(/\n```/gm, '');
    
    // Eliminar cualquier mención a insertar en un archivo específico
    cleaned = cleaned.replace(/^\/\/\s*filepath:.*$/gm, '');
    
    return cleaned;
  }

  /**
   * Genera un archivo ZIP con el proyecto completo
   * @param {string} outputPath - Ruta donde se ha generado el proyecto
   * @param {string} zipName - Nombre del archivo ZIP (opcional)
   * @returns {Promise<string>} - Ruta del archivo ZIP generado
   */
  async generateProjectZip(outputPath, zipName) {
    try {
      const projectName = path.basename(outputPath);
      const zipFileName = zipName || `${projectName}.zip`;
      const zipFilePath = path.join(path.dirname(outputPath), zipFileName);
      
      console.log(`📦 Generando archivo ZIP: ${zipFilePath}`);
      
      return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(zipFilePath);
        const archive = archiver('zip', {
          zlib: { level: 9 } // Nivel máximo de compresión
        });
        
        output.on('close', () => {
          console.log(`✅ Archivo ZIP creado: ${zipFilePath} (${archive.pointer()} bytes)`);
          resolve(zipFilePath);
        });
        
        archive.on('error', (err) => {
          reject(err);
        });
        
        archive.pipe(output);
        archive.directory(outputPath, false);
        archive.finalize();
      });
    } catch (error) {
      console.error('Error al generar ZIP:', error);
      throw error;
    }
  }
  
  /**
   * Permite editar un archivo específico antes de finalizar la generación
   * @param {string} filePath - Ruta del archivo a editar
   * @param {string} newContent - Nuevo contenido para el archivo
   * @returns {Promise<boolean>} - True si la edición fue exitosa
   */
  async editGeneratedFile(filePath, newContent) {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`El archivo ${filePath} no existe`);
      }
      
      await fs.writeFile(filePath, newContent, 'utf8');
      console.log(`✏️ Archivo editado: ${filePath}`);
      return true;
    } catch (error) {
      console.error('Error al editar archivo:', error);
      throw error;
    }
  }

  /**
   * Valida la arquitectura generada para asegurar que incluye todo lo necesario
   * @param {Object} architecture - Arquitectura generada
   * @param {string} description - Descripción del proyecto
   * @returns {Object} - Arquitectura validada y posiblemente mejorada
   */
  async validateArchitecture(architecture, description) {
    try {
      console.log('🔍 Validando la arquitectura generada...');
      
      // Verificar componentes esenciales
      const hasModels = architecture.folders.some(f => f.path.includes('/models'));
      const hasControllers = architecture.folders.some(f => f.path.includes('/controllers'));
      const hasRoutes = architecture.folders.some(f => f.path.includes('/routes'));
      const hasConfig = architecture.folders.some(f => f.path.includes('/config'));
      
      // Si faltan componentes esenciales, regenerar con instrucciones más específicas
      if (!hasModels || !hasControllers || !hasRoutes || !hasConfig) {
        console.log('⚠️ Arquitectura incompleta, añadiendo componentes esenciales...');
        
        // Añadir carpetas faltantes
        if (!hasModels) {
          architecture.folders.push({
            path: "models",
            description: "Modelos de datos y esquemas"
          });
        }
        
        if (!hasControllers) {
          architecture.folders.push({
            path: "controllers",
            description: "Controladores para la lógica de negocio"
          });
        }
        
        if (!hasRoutes) {
          architecture.folders.push({
            path: "routes",
            description: "Definición de rutas API"
          });
        }
        
        if (!hasConfig) {
          architecture.folders.push({
            path: "config",
            description: "Archivos de configuración"
          });
        }
        
        // Extraer entidades del proyecto para crear archivos mínimos necesarios
        const entitiesPrompt = `
          Analiza esta descripción de proyecto: "${description}"
          
          Extrae las principales entidades/modelos que necesitarán CRUD en este proyecto.
          Responde únicamente con un array JSON de strings con los nombres de las entidades en singular.
          Ejemplo: ["usuario", "producto", "pedido"]
        `;
        
        const response = await this.client.chat.completions.create({
          messages: [
            { role: "system", content: "Extrae las entidades principales de un proyecto" },
            { role: "user", content: entitiesPrompt }
          ],
          model: "deepseek-chat",
          temperature: 0.1,
          max_tokens: 500
        });
        
        let entities = [];
        try {
          const entitiesText = response.choices[0].message.content;
          const entitiesMatch = entitiesText.match(/\[[\s\S]*\]/);
          if (entitiesMatch) {
            entities = JSON.parse(entitiesMatch[0]);
          }
        } catch (e) {
          console.warn('No se pudieron extraer entidades:', e.message);
        }
        
        // Crear archivos mínimos necesarios para cada entidad
        for (const entity of entities) {
          const entityName = entity.toLowerCase();
          
          // Añadir modelo
          architecture.files.push({
            path: `models/${entityName}.js`,
            description: `Modelo para la entidad ${entityName}`,
            useTemplate: true,
            templateType: "model"
          });
          
          // Añadir controlador
          architecture.files.push({
            path: `controllers/${entityName}Controller.js`,
            description: `Controlador CRUD para ${entityName}`,
            useTemplate: true,
            templateType: "controller"
          });
          
          // Añadir ruta
          architecture.files.push({
            path: `routes/${entityName}Routes.js`,
            description: `Rutas API para ${entityName}`,
            useTemplate: true,
            templateType: "route"
          });
        }
        
        // Asegurar que existe app.js o index.js en la raíz
        const hasMainFile = architecture.files.some(f => 
          f.path === 'app.js' || f.path === 'index.js' || f.path === 'server.js'
        );
        
        if (!hasMainFile) {
          architecture.files.push({
            path: 'app.js',
            description: 'Archivo principal de la aplicación',
            useTemplate: true,
            templateType: "main"
          });
        }
        
        // Añadir otros archivos esenciales
        const hasPackageJson = architecture.files.some(f => f.path === 'package.json');
        if (!hasPackageJson) {
          architecture.files.push({
            path: 'package.json',
            description: 'Configuración del proyecto y dependencias',
            useTemplate: true,
            templateType: "config"
          });
        }
        
        const hasEnv = architecture.files.some(f => f.path === '.env.example' || f.path === '.env');
        if (!hasEnv) {
          architecture.files.push({
            path: '.env.example',
            description: 'Variables de entorno de ejemplo',
            useTemplate: true,
            templateType: "config"
          });
        }
      }
      
      console.log('✅ Arquitectura validada correctamente');
      return architecture;
    } catch (error) {
      console.error('Error al validar arquitectura:', error);
      return architecture; // Devolver la arquitectura original en caso de error
    }
  }
  
  /**
   * Genera recomendaciones de configuración basadas en la descripción del proyecto
   * @param {string} description - Descripción del proyecto
   * @param {string} prompt - Prompt para la generación de recomendaciones
   * @returns {Promise<Object>} Objeto con las recomendaciones
   */
  async generateRecommendation(description, prompt) {
    try {
      console.log('Generando recomendaciones basadas en la descripción...');
      
      // Usar directamente el cliente OpenAI configurado en el constructor
      const response = await this.client.chat.completions.create({
        messages: [
          { role: "system", content: "Eres un experto en arquitectura de software que proporciona recomendaciones precisas y detalladas para proyectos de desarrollo. Respondes siempre en formato JSON estructurado." },
          { role: "user", content: prompt }
        ],
        model: "deepseek-chat",
        temperature: 0.2,
        max_tokens: 2048
      });
      
      // Extraer respuesta
      const responseText = response.choices[0].message.content;
      
      // Intentar extraer JSON de la respuesta
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No se pudo extraer una respuesta JSON válida');
      }
      
      // Parsear y validar JSON
      const recommendation = JSON.parse(jsonMatch[0]);
      
      // Establecer valores predeterminados si faltan propiedades
      const defaultRecommendation = {
        database: 'MongoDB',
        framework: 'Express',
        auth: 'JWT',
        includeGraphQL: false,
        includeWebsockets: false,
        includeGlobalQuery: false,
        recommendations: [],
        suggestions: []
      };
      
      // Combinar con valores predeterminados
      return { ...defaultRecommendation, ...recommendation };
    } catch (error) {
      console.error('Error al generar recomendaciones:', error);
      
      // Retornar recomendaciones predeterminadas en caso de error
      return {
        database: 'MongoDB',
        framework: 'Express',
        auth: 'JWT',
        includeGraphQL: false,
        includeWebsockets: false,
        includeGlobalQuery: false,
        recommendations: [
          "No se pudieron obtener recomendaciones personalizadas debido a un error."
        ],
        suggestions: []
      };
    }
  }
  
  // Métodos privados auxiliares
  
  /**
   * Determina si un tipo de archivo debería almacenarse en caché
   * @param {string} filePath - Ruta del archivo
   * @returns {boolean} - Si el archivo es cacheable
   * @private
   */
  _isCacheable(filePath) {
    // Archivos genéricos que podrían reutilizarse
    return (
      filePath.includes('/middleware/auth.js') ||
      filePath.includes('/config/database.js') ||
      filePath.includes('/utils/') ||
      filePath.includes('/helpers/')
    );
  }
  
  /**
   * Genera una clave de caché basada en la ruta y contexto
   * @param {string} filePath - Ruta del archivo
   * @param {Object} context - Contexto del proyecto
   * @returns {string} - Clave de caché
   * @private
   */
  _getCacheKey(filePath, context) {
    const fileName = path.basename(filePath);
    const fileDir = path.dirname(filePath).split('/').pop();
    const dbType = context.database || 'generic';
    
    return `${fileDir}_${fileName}_${dbType}`;
  }
  
  /**
   * Genera prompt especializado para modelos
   * @private
   */
  _getModelPrompt(filePath, description, context) {
    const modelName = path.basename(filePath, '.js');
    return `
      Actúa como un desarrollador senior experto en ${context.database || 'MongoDB'}.
      Necesito que generes código para un modelo de datos con la siguiente información:
      
      Entidad: ${modelName}
      Descripción: ${description}
      Base de datos: ${context.database || 'MongoDB'}
      
      Consideraciones importantes:
      - Utiliza un esquema optimizado con tipos apropiados.
      - Incluye solo los campos necesarios según la descripción.
      - Añade índices para optimizar rendimiento si es necesario.
      - Incluye timestamps (createdAt, updatedAt).
      - Implementa validadores para campos críticos.
      - Añade métodos de instancia útiles solo si son esenciales.
      
      Genera solo el modelo, sin importaciones o configuración adicional.
    `;
  }
  
  /**
   * Genera prompt especializado para controladores
   * @private
   */
  _getControllerPrompt(filePath, description, context) {
    const controllerName = path.basename(filePath, '.js');
    // Extraer el nombre del modelo relacionado
    const modelName = controllerName.replace('Controller', '');
    
    return `
      Actúa como un desarrollador senior de ${context.language || 'JavaScript'}.
      Necesito que generes código para un controlador CRUD con la siguiente información:
      
      Controlador: ${controllerName}
      Modelo relacionado: ${modelName}
      Descripción: ${description}
      Framework: ${context.framework || 'Express'}
      
      Consideraciones importantes:
      - Implementa operaciones CRUD completas y optimizadas.
      - Maneja correctamente errores y códigos HTTP apropiados.
      - Incluye validación de datos de entrada.
      - Usa async/await para operaciones asíncronas.
      - No uses "ModelName.controller" sino directamente "ModelName".
      - La referencia al modelo debe ser limpia: const Model = require('../models/modelName');
      
      Genera solo el controlador, sin importaciones adicionales irrelevantes.
    `;
  }
  
  /**
   * Genera prompt especializado para rutas
   * @private
   */
  _getRoutePrompt(filePath, description, context) {
    const routeName = path.basename(filePath, '.js');
    // Intentar extraer el nombre del controlador relacionado
    const controllerName = routeName.includes('Routes') 
      ? routeName.replace('Routes', 'Controller')
      : `${routeName}Controller`;
    
    return `
      Actúa como un desarrollador senior de ${context.framework || 'Express'}.
      Necesito que generes código para rutas API con la siguiente información:
      
      Rutas para: ${routeName}
      Controlador relacionado: ${controllerName}
      Descripción: ${description}
      Autenticación: ${context.auth || 'JWT'}
      
      Consideraciones importantes:
      - Define rutas RESTful bien estructuradas.
      - Implementa validación de parámetros si es necesario.
      - Incluye middleware de autenticación donde corresponda.
      - Usa router.route() para agrupar rutas con el mismo path.
      - Sigue convenciones de nomenclatura de API REST.
      
      Genera solo las rutas, con las importaciones necesarias.
    `;
  }
  
  /**
   * Genera prompt especializado para middleware
   * @private
   */
  _getMiddlewarePrompt(filePath, description, context) {
    return `
      Actúa como un desarrollador senior de ${context.framework || 'Express'}.
      Necesito que generes código para un middleware con la siguiente información:
      
      Middleware: ${path.basename(filePath, '.js')}
      Descripción: ${description}
      Autenticación: ${context.auth || 'JWT'}
      
      Consideraciones importantes:
      - El middleware debe ser conciso y enfocado en una sola responsabilidad.
      - Maneja correctamente errores y llamadas a next().
      - Usa async/await para operaciones asíncronas si es necesario.
      - Implementa validación adecuada para su propósito.
      
      Genera solo el middleware, con las importaciones necesarias.
    `;
  }
  
  /**
   * Genera prompt especializado para archivos de configuración
   * @private
   */
  _getConfigPrompt(filePath, description, context) {
    return `
      Actúa como un desarrollador senior de ${context.language || 'JavaScript'}.
      Necesito que generes código para un archivo de configuración con la siguiente información:
      
      Archivo: ${path.basename(filePath)}
      Descripción: ${description}
      Entorno: Node.js
      
      Consideraciones importantes:
      - La configuración debe ser robusta y segura.
      - Usa variables de entorno para valores sensibles.
      - Incluye valores por defecto razonables.
      - Añade comentarios para explicar opciones complejas.
      - Implementa validación de configuración si es necesario.
      
      Genera solo el archivo de configuración, con las importaciones necesarias.
    `;
  }
}

module.exports = DeepseekAgent;
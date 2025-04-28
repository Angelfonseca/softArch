/**
 * Generador de estructuras de proyectos basado en la arquitectura
 */
const fs = require('fs-extra');
const path = require('path');
const DeepseekAgent = require('../agent/deepseekAgent');
const TemplateProcessor = require('../utils/templateProcessor');
const DiagramService = require('../services/diagramService');

class ProjectGenerator {
  constructor() {
    this.agent = new DeepseekAgent();
    this.templateProcessor = new TemplateProcessor();
    this.diagramService = new DiagramService();
  }

  /**
   * Genera la estructura de carpetas y archivos para un proyecto
   * @param {string} description - Descripción del proyecto
   * @param {string} outputPath - Ruta donde se generará el proyecto
   * @returns {Object} Estructura generada
   */
  async generateStructure(description, outputPath) {
    try {
      // Mensaje inicial más detallado
      console.log('Iniciando la generación de la estructura del proyecto...');
      console.log('Consultando al modelo de IA para obtener recomendaciones de arquitectura...');
      
      // Obtener la arquitectura recomendada desde el agente de IA
      const architecture = await this.agent.generateArchitecture(description);
      
      console.log('✅ Arquitectura recomendada recibida correctamente');
      console.log(`Total de carpetas a crear: ${architecture.folders.length}`);
      console.log(`Total de archivos a generar: ${architecture.files.length}`);
      
      // Crear las carpetas
      console.log('\n📁 Creando estructura de carpetas...');
      for (const folder of architecture.folders) {
        const folderPath = path.join(outputPath, folder.path);
        await fs.ensureDir(folderPath);
        console.log(`  ✓ Carpeta creada: ${folderPath}`);
      }

      // Contexto del proyecto para la generación de código
      const context = {
        description,
        language: 'JavaScript',
        framework: 'Express',
        folders: architecture.folders,
        files: architecture.files
      };

      // Crear los archivos
      console.log('\n📄 Generando archivos del proyecto...');
      let fileCounter = 0;
      const totalFiles = architecture.files.length;
      
      for (const file of architecture.files) {
        fileCounter++;
        const filePath = path.join(outputPath, file.path);
        
        // Mostrar progreso
        console.log(`\n[${fileCounter}/${totalFiles}] Generando: ${file.path}`);
        console.log(`  Descripción: ${file.description}`);
        
        // Generar código para el archivo usando directamente el agente de IA
        console.log('  Solicitando código al modelo de IA...');
        const code = await this.agent.generateCode(file.path, file.description, context);
        
        // Asegurarse de que la carpeta exista
        await fs.ensureDir(path.dirname(filePath));
        
        // Escribir el archivo
        await fs.writeFile(filePath, code);
        console.log(`  ✅ Archivo creado correctamente: ${filePath}`);
      }

      console.log('\n🎉 Generación de estructura completada con éxito!');
      return architecture;
    } catch (error) {
      console.error('❌ Error al generar la estructura del proyecto:', error);
      throw error;
    }
  }

  /**
   * Genera un backend con tablas y conexiones basado en la descripción
   * @param {string} description - Descripción del backend
   * @param {string} outputPath - Ruta donde se generará el backend
   * @param {Object} options - Opciones adicionales (base de datos, framework, etc.)
   * @returns {Object} Información del backend generado
   */
  async generateBackend(description, outputPath, options = {}) {
    try {
      console.log('\n🚀 Iniciando generación de backend...');
      console.log(`💬 Descripción: "${description}"`);
      console.log('⚙️  Configuración:');
      console.log(`  - Base de datos: ${options.database || 'MongoDB'}`);
      console.log(`  - Framework: ${options.framework || 'Express'}`);
      console.log(`  - Autenticación: ${options.auth || 'JWT'}`);
      console.log(`  - Consulta global: ${options.includeGlobalQuery ? 'Sí' : 'No'}`);
      
      // Solicitar al agente que genere la estructura específica para un backend
      const backendPrompt = `
        Genera una arquitectura de backend para una API con las siguientes características:
        - Base de datos: ${options.database || 'MongoDB'}
        - Framework: ${options.framework || 'Express'}
        - Autenticación: ${options.auth || 'JWT'}
        - Descripción: ${description}
        
        Debe incluir modelos, controladores, rutas, middleware, y configuración de base de datos.
        El proyecto debe estar listo para uso y despliegue inmediato.
        Incluye instrucciones de instalación y configuración en un README.md.
        Incluye un archivo package.json con todas las dependencias necesarias.
        Proporciona un archivo .env.example con las variables de entorno necesarias.
        ${options.includeGlobalQuery ? 'Incluye un archivo de consulta global (globalQuery.js) en la carpeta de rutas.' : ''}
      `;
      
      console.log('\n🧠 Consultando al modelo de IA para diseñar la arquitectura...');
      console.log('   (Este proceso puede tardar hasta 30 segundos)');
      const architecture = await this.agent.generateArchitecture(backendPrompt);
      
      console.log('\n✅ Arquitectura recibida correctamente');
      console.log(`📂 Total de carpetas: ${architecture.folders.length}`);
      console.log(`📄 Total de archivos: ${architecture.files.length}`);
      
      // Contexto enriquecido para la generación del backend
      const context = {
        ...options,
        description,
        language: options.language || 'JavaScript',
        database: options.database || 'MongoDB',
        framework: options.framework || 'Express',
        auth: options.auth || 'JWT',
        folders: architecture.folders,
        files: architecture.files
      };

      console.log('\n📁 Creando estructura de carpetas...');
      // Generar la estructura básica
      for (const folder of architecture.folders) {
        const folderPath = path.join(outputPath, folder.path);
        await fs.ensureDir(folderPath);
        console.log(`   ✓ ${folderPath}`);
      }

      console.log('\n🔍 Analizando modelos y rutas del proyecto...');
      // Generar los archivos con el código específico para el backend
      const modelFiles = [];
      
      // Primera pasada: identificar modelos para construir el contexto completo
      for (const file of architecture.files) {
        if (this._getFileTypeFromPath(file.path) === 'model') {
          modelFiles.push({
            name: this._getModelNameFromPath(file.path),
            path: file.path,
            description: file.description
          });
          console.log(`   ✓ Modelo identificado: ${this._getModelNameFromPath(file.path)}`);
        }
      }
      
      // Agregar información de modelos al contexto
      context.models = modelFiles;
      
      // Preparar datos de rutas para la app.js
      const routes = [];
      for (const file of architecture.files) {
        if (this._getFileTypeFromPath(file.path) === 'route') {
          const routeName = path.basename(file.path, '.js');
          routes.push({
            path: routeName,
            file: routeName
          });
          console.log(`   ✓ Ruta identificada: ${routeName}`);
        }
      }
      
      // Añadir globalQuery si está habilitado
      if (options.includeGlobalQuery) {
        // Verificar si ya existe un archivo de globalQuery en la estructura
        let globalQueryExists = false;
        for (const file of architecture.files) {
          if (file.path.includes('globalQuery.js') || file.path.includes('global-query.js')) {
            globalQueryExists = true;
            break;
          }
        }
        
        if (!globalQueryExists) {
          // Añadir la ruta de globalQuery
          const globalQueryPath = 'routes/globalQuery.js';
          const fullPath = path.join(outputPath, globalQueryPath);
          
          // Añadir al contexto
          routes.push({
            path: 'global-query',
            file: 'globalQuery'
          });
          
          // Generar el archivo de globalQuery
          console.log('\n🔄 Generando archivo de consulta global...');
          const globalQueryCode = await this.templateProcessor.generateGlobalQuery();
          
          await fs.ensureDir(path.dirname(fullPath));
          await fs.writeFile(fullPath, globalQueryCode);
          console.log(`   ✅ Archivo creado: ${fullPath}`);
        }
      }
      
      // Segunda pasada: generar todos los archivos
      console.log('\n📄 Generando archivos del proyecto...');
      let fileCounter = 0;
      const totalFiles = architecture.files.length;
      
      for (const file of architecture.files) {
        fileCounter++;
        const filePath = path.join(outputPath, file.path);
        let code;
        
        // Determinar si usamos una plantilla base o generamos completamente con IA
        const fileExtension = path.extname(file.path).toLowerCase();
        const fileName = path.basename(file.path, fileExtension);
        const fileType = this._getFileTypeFromPath(file.path);
        
        console.log(`\n[${fileCounter}/${totalFiles}] Generando: ${file.path}`);
        console.log(`   Tipo: ${fileType || 'Archivo general'}`);
        
        if (fileType === 'model' && fileExtension === '.js') {
          // Para modelos, usamos plantilla Handlebars mejorada
          console.log('   Generando modelo con campos y métodos...');
          const modelData = {
            modelName: this._getModelNameFromPath(file.path),
            fields: await this._generateModelFields(file.description, context),
            methods: await this._generateModelMethods(file.description, context),
            statics: []
          };
          
          code = await this.templateProcessor.generateModel(modelData);
          
        } else if (fileType === 'controller' && fileExtension === '.js') {
          // Para controladores, usamos plantilla Handlebars con código IA
          console.log('   Generando controlador con operaciones CRUD...');
          const controllerData = {
            modelName: this._getModelNameFromPath(file.path),
            modelFileName: this._getModelFileNameFromPath(file.path),
          };
          
          code = await this.templateProcessor.generateController(controllerData);
          
        } else if (fileType === 'route' && fileExtension === '.js') {
          // Para rutas, usamos plantilla Handlebars con código IA
          console.log('   Generando rutas con endpoints REST...');
          const routeData = {
            modelName: this._getModelNameFromPath(file.path),
            controllerFileName: this._getModelFileNameFromPath(file.path) + 'Controller',
            authMiddleware: options.auth !== 'none'
          };
          
          code = await this.templateProcessor.generateRoute(routeData);
          
        } else if (fileName === 'app' && fileExtension === '.js') {
          // Para app.js, usamos la plantilla específica
          console.log('   Generando archivo principal de la aplicación...');
          const appData = {
            routes,
            database: options.database || 'MongoDB',
          };
          
          code = await this.templateProcessor.generateApp(appData);
          
        } else if (fileName === 'globalQuery' && fileExtension === '.js') {
          // Para globalQuery.js, usar la plantilla específica si existe en los archivos
          console.log('   Generando archivo de consulta global...');
          code = await this.templateProcessor.generateGlobalQuery();
          
        } else {
          // Para otros archivos, generar completamente con IA
          console.log('   Generando código con IA...');
          code = await this.templateProcessor.generateCompleteFile(file.path, file.description, context);
        }
        
        // Asegurarse de que la carpeta exista
        await fs.ensureDir(path.dirname(filePath));
        
        // Escribir el archivo
        await fs.writeFile(filePath, code);
        console.log(`   ✅ Archivo creado: ${filePath}`);
      }

      // Actualizar el archivo app.js si se incluye globalQuery pero no está en la arquitectura original
      if (options.includeGlobalQuery) {
        const appPath = path.join(outputPath, 'app.js');
        if (await fs.exists(appPath)) {
          let appContent = await fs.readFile(appPath, 'utf8');
          
          // Verificar si ya incluye la ruta de globalQuery
          if (!appContent.includes('global-query') && !appContent.includes('globalQuery')) {
            console.log('\n🔄 Actualizando app.js para incluir la ruta de consulta global...');
            
            // Buscar la sección de rutas para añadir la nueva ruta
            const routeSection = appContent.match(/\/\/ Rutas[\s\S]*?app\.use/);
            if (routeSection) {
              const updatedContent = appContent.replace(
                routeSection[0],
                `${routeSection[0]}\napp.use('/api/global-query', require('./routes/globalQuery'));\n\n// Otras rutas\napp.use`
              );
              await fs.writeFile(appPath, updatedContent);
              console.log('   ✅ Archivo app.js actualizado correctamente');
            }
          }
        }
      }

      console.log('\n🎉 Backend generado con éxito!');
      console.log(`📁 Ubicación: ${outputPath}`);
      console.log('⚡ El proyecto está listo para uso y despliegue.');
      
      return { architecture, outputPath };
    } catch (error) {
      console.error('\n❌ Error al generar el backend:', error);
      throw error;
    }
  }

  /**
   * Guarda la configuración y vista previa de un proyecto para uso futuro
   * @param {string} projectName - Nombre del proyecto
   * @param {string} description - Descripción del proyecto
   * @param {Object} options - Opciones de configuración
   * @param {Object} architecture - Arquitectura generada
   * @returns {Promise<Object>} - Resultado de la operación
   */
  async saveProjectConfiguration(projectName, description, options, architecture) {
    try {
      console.log(`\n💾 Guardando configuración del proyecto "${projectName}"...`);
      
      // Crear objeto de configuración
      const projectConfig = {
        name: projectName,
        description,
        options,
        architecture,
        createdAt: new Date().toISOString()
      };
      
      // Ruta para guardar las configuraciones
      const configDir = path.join(process.cwd(), 'saved-projects');
      await fs.ensureDir(configDir);
      
      const configPath = path.join(configDir, `${projectName}.json`);
      
      // Verificar si ya existe un proyecto con ese nombre
      if (await fs.pathExists(configPath)) {
        console.log(`\n⚠️ Ya existe un proyecto con el nombre "${projectName}".`);
        return { success: false, message: 'El proyecto ya existe' };
      }
      
      // Guardar configuración
      await fs.writeJson(configPath, projectConfig, { spaces: 2 });
      
      console.log(`✅ Configuración guardada en: ${configPath}`);
      return { 
        success: true, 
        configPath,
        project: projectConfig
      };
    } catch (error) {
      console.error('Error al guardar la configuración del proyecto:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Lista todos los proyectos guardados localmente
   * @returns {Promise<Array>} - Lista de proyectos guardados
   */
  async listSavedProjects() {
    try {
      const configDir = path.join(process.cwd(), 'saved-projects');
      
      // Verificar si existe el directorio
      if (!await fs.pathExists(configDir)) {
        return [];
      }
      
      // Listar archivos JSON
      const files = await fs.readdir(configDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      // Cargar información básica de cada proyecto
      const projects = [];
      
      for (const file of jsonFiles) {
        try {
          const configPath = path.join(configDir, file);
          const projectConfig = await fs.readJson(configPath);
          
          projects.push({
            name: projectConfig.name,
            description: projectConfig.description,
            createdAt: projectConfig.createdAt,
            path: configPath,
            database: projectConfig.options.database,
            framework: projectConfig.options.framework
          });
        } catch (error) {
          console.warn(`Error al leer el archivo ${file}:`, error.message);
        }
      }
      
      return projects;
    } catch (error) {
      console.error('Error al listar proyectos guardados:', error);
      return [];
    }
  }

  /**
   * Carga la configuración de un proyecto guardado
   * @param {string} projectName - Nombre del proyecto
   * @returns {Promise<Object|null>} - Configuración del proyecto o null si no existe
   */
  async loadProjectConfiguration(projectName) {
    try {
      const configDir = path.join(process.cwd(), 'saved-projects');
      const configPath = path.join(configDir, `${projectName}.json`);
      
      // Verificar si existe el archivo
      if (!await fs.pathExists(configPath)) {
        return null;
      }
      
      // Cargar configuración
      const projectConfig = await fs.readJson(configPath);
      return projectConfig;
    } catch (error) {
      console.error(`Error al cargar la configuración del proyecto ${projectName}:`, error);
      return null;
    }
  }

  /**
   * Genera un proyecto a partir de una configuración guardada
   * @param {string} projectName - Nombre del proyecto guardado
   * @param {string} outputPath - Ruta de salida (opcional)
   * @returns {Promise<Object>} - Resultado de la generación
   */
  async generateFromSaved(projectName, outputPath = null) {
    try {
      console.log(`\n🔄 Generando proyecto a partir de la configuración guardada: "${projectName}"`);
      
      // Cargar configuración
      const projectConfig = await this.loadProjectConfiguration(projectName);
      
      if (!projectConfig) {
        throw new Error(`No se encontró un proyecto guardado con el nombre "${projectName}"`);
      }
      
      // Determinar ruta de salida
      const targetPath = outputPath || path.join(process.cwd(), 'output', projectName);
      
      console.log(`📝 Descripción: ${projectConfig.description}`);
      console.log(`📁 Ruta de salida: ${targetPath}`);
      console.log(`💾 Base de datos: ${projectConfig.options.database}`);
      console.log(`🚀 Framework: ${projectConfig.options.framework}`);
      
      // Generar el proyecto usando las opciones guardadas
      const result = await this.generateBackend(
        projectConfig.description,
        targetPath,
        projectConfig.options
      );
      
      return {
        ...result,
        projectName,
        outputPath: targetPath
      };
    } catch (error) {
      console.error('Error al generar proyecto desde configuración guardada:', error);
      throw error;
    }
  }

  /**
   * Interactúa con el agente de IA para obtener recomendaciones de configuración
   * @param {string} description - Descripción del proyecto
   * @param {Object} options - Opciones iniciales proporcionadas por el usuario
   * @returns {Promise<Object>} Opciones enriquecidas con recomendaciones de IA
   */
  async interactWithAgent(description, options = {}) {
    try {
      console.log('\n🤖 Consultando al agente de IA para recomendaciones...');
      
      // Construir el prompt para el agente
      const prompt = `
        Analiza esta descripción de proyecto y proporciona recomendaciones de configuración:
        "${description}"
        
        Responde con un objeto JSON con las siguientes propiedades:
        1. database: Base de datos recomendada (MongoDB, PostgreSQL, MySQL, etc.)
        2. framework: Framework recomendado (Express, Koa, Fastify, etc.)
        3. auth: Método de autenticación recomendado (JWT, OAuth2, API Key, etc.)
        4. includeGraphQL: Si recomiendas incluir GraphQL (true/false)
        5. includeWebsockets: Si recomiendas incluir WebSockets (true/false)
        6. includeGlobalQuery: Si recomiendas incluir una consulta global (true/false)
        7. recommendations: Arreglo de recomendaciones específicas para este proyecto
        8. suggestions: Arreglo de sugerencias de paquetes npm útiles para este proyecto
        
        También explica brevemente por qué haces cada recomendación.
      `;
      
      // Consultar al agente
      const recommendation = await this.agent.generateRecommendation(description, prompt);
      
      console.log('\n✅ Recomendaciones del agente recibidas');
      console.log('📊 Resumen de recomendaciones:');
      console.log(`  - Base de datos: ${recommendation.database}`);
      console.log(`  - Framework: ${recommendation.framework}`);
      console.log(`  - Autenticación: ${recommendation.auth}`);
      console.log(`  - Incluir GraphQL: ${recommendation.includeGraphQL ? 'Sí' : 'No'}`);
      console.log(`  - Incluir WebSockets: ${recommendation.includeWebsockets ? 'Sí' : 'No'}`);
      
      if (recommendation.recommendations && recommendation.recommendations.length > 0) {
        console.log('\n💡 Recomendaciones específicas:');
        recommendation.recommendations.forEach((rec, index) => {
          console.log(`  ${index + 1}. ${rec}`);
        });
      }
      
      if (recommendation.suggestions && recommendation.suggestions.length > 0) {
        console.log('\n📦 Paquetes recomendados:');
        recommendation.suggestions.forEach((pkg, index) => {
          console.log(`  ${index + 1}. ${pkg}`);
        });
      }
      
      // Combinar las opciones del usuario con las recomendaciones
      // Priorizar las opciones del usuario sobre las recomendaciones
      const enrichedOptions = {
        ...recommendation,
        ...options
      };
      
      return {
        options: enrichedOptions,
        recommendation
      };
    } catch (error) {
      console.error('Error al interactuar con el agente:', error);
      console.log('Continuando con las opciones proporcionadas por el usuario...');
      return { options };
    }
  }

  /**
   * Genera una vista previa de la arquitectura y permite interactuar con el agente
   * @param {string} description - Descripción del proyecto
   * @param {Object} options - Opciones de generación
   * @returns {Promise<Object>} - Resultado con la arquitectura y opciones actualizadas
   */
  async generatePreview(description, options = {}) {
    try {
      console.log('\n🔍 Generando vista previa de la arquitectura...');
      
      // Obtener recomendaciones del agente
      const { options: enrichedOptions, recommendation } = await this.interactWithAgent(description, options);
      
      // Generar una arquitectura preliminar basada en la descripción y opciones
      const previewPrompt = `
        Genera una arquitectura preliminar para un proyecto con esta descripción:
        "${description}"
        
        Configuraciones:
        - Base de datos: ${enrichedOptions.database || 'MongoDB'}
        - Framework: ${enrichedOptions.framework || 'Express'}
        - Autenticación: ${enrichedOptions.auth || 'JWT'}
        - GraphQL: ${enrichedOptions.includeGraphQL ? 'Sí' : 'No'}
        
        Incluye solo la estructura de carpetas y los archivos principales.
        Responde con un objeto JSON que contenga 'folders' y 'files' donde 'files' solo debe incluir
        los 5-10 archivos más importantes del proyecto.
      `;
      
      const previewArchitecture = await this.agent.generateArchitecture(previewPrompt);
      
      // Mostrar la vista previa
      console.log('\n📋 Vista previa de la arquitectura:');
      console.log('\n📁 Carpetas principales:');
      previewArchitecture.folders.slice(0, 10).forEach(folder => {
        console.log(`  - ${folder.path} (${folder.description})`);
      });
      
      if (previewArchitecture.folders.length > 10) {
        console.log(`  ... y ${previewArchitecture.folders.length - 10} carpetas más`);
      }
      
      console.log('\n📄 Archivos principales:');
      previewArchitecture.files.slice(0, 10).forEach(file => {
        console.log(`  - ${file.path} (${file.description})`);
      });
      
      if (previewArchitecture.files.length > 10) {
        console.log(`  ... y ${previewArchitecture.files.length - 10} archivos más`);
      }
      
      return {
        architecture: previewArchitecture,
        options: enrichedOptions,
        recommendation
      };
    } catch (error) {
      console.error('Error al generar vista previa:', error);
      throw error;
    }
  }

  /**
   * Genera una API GraphQL basada en modelos existentes o en nuevos modelos según la descripción
   * @param {string} description - Descripción de la API GraphQL
   * @param {string} outputPath - Ruta donde se generará la API
   * @param {Object} options - Opciones adicionales
   * @returns {Promise<Object>} - Resultado de la generación
   */
  async generateGraphQLAPI(description, outputPath, options = {}) {
    try {
      console.log('\n🚀 Iniciando generación de API GraphQL...');
      console.log(`💬 Descripción: "${description}"`);
      console.log('⚙️ Configuración:');
      console.log(`  - Base de datos: ${options.database || 'MongoDB'}`);
      console.log(`  - Modelo de autenticación: ${options.auth || 'JWT'}`);
      
      // Determinar si usamos modelos existentes o generamos nuevos
      let models = [];
      let architecture = null;
      
      if (options.useExistingModels) {
        console.log('🔍 Buscando modelos existentes en el proyecto...');
        // Buscar modelos en la carpeta de modelos
        const modelsDir = path.join(outputPath, 'models');
        
        if (await fs.pathExists(modelsDir)) {
          const modelFiles = await fs.readdir(modelsDir);
          
          for (const modelFile of modelFiles) {
            if (modelFile.endsWith('.js')) {
              const modelName = path.basename(modelFile, '.js');
              const modelPath = path.join(modelsDir, modelFile);
              const modelContent = await fs.readFile(modelPath, 'utf8');
              
              models.push({
                name: this._extractModelName(modelContent) || modelName.charAt(0).toUpperCase() + modelName.slice(1),
                fields: this._extractModelFields(modelContent),
                path: modelPath
              });
              
              console.log(`  ✓ Modelo encontrado: ${modelName}`);
            }
          }
        } else {
          console.warn('❗ No se encontró carpeta de modelos. Se generarán modelos nuevos.');
        }
      }
      
      // Si no se encontraron modelos o no se usan modelos existentes, generar nuevos
      if (models.length === 0) {
        console.log('\n🧠 Generando modelos basados en la descripción...');
        
        // Solicitar al agente que genere modelos basados en la descripción
        const modelsPrompt = `
          Basado en esta descripción: "${description}"
          
          Genera un array de modelos para una API GraphQL. Cada modelo debe incluir:
          - name: Nombre del modelo (PascalCase)
          - fields: Array de objetos con propiedades name, type, required
          
          Los tipos deben ser compatibles con GraphQL (String, Int, Float, Boolean, ID).
          Para relaciones, usa los tipos de los otros modelos.
          
          Ejemplo:
          [
            {
              "name": "User",
              "fields": [
                {"name": "id", "type": "ID", "required": true},
                {"name": "email", "type": "String", "required": true},
                {"name": "posts", "type": "[Post]", "required": false}
              ]
            },
            {
              "name": "Post",
              "fields": [
                {"name": "id", "type": "ID", "required": true},
                {"name": "title", "type": "String", "required": true},
                {"name": "author", "type": "User", "required":true}
              ]
            }
          ]
          
          Retorna SOLO un array JSON válido.
        `;
        
        const modelsJsonString = await this.agent.generateCode(
          'graphql_models',
          modelsPrompt,
          { description }
        );
        
        // Extraer el array JSON de la respuesta
        const jsonMatch = modelsJsonString.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          models = JSON.parse(jsonMatch[0]);
          console.log(`✅ Se generaron ${models.length} modelos para la API GraphQL`);
          
          // Crear archivos de modelos si no existen
          if (!await fs.pathExists(path.join(outputPath, 'models'))) {
            await fs.ensureDir(path.join(outputPath, 'models'));
          }
          
          for (const model of models) {
            const modelPath = path.join(outputPath, 'models', `${model.name.toLowerCase()}.js`);
            
            // Solo crear el modelo si no existe
            if (!await fs.pathExists(modelPath)) {
              const modelCode = await this._generateModelCodeForGraphQL(model);
              await fs.writeFile(modelPath, modelCode);
              console.log(`  ✓ Modelo creado: ${model.name}`);
            } else {
              console.log(`  ℹ️ Modelo ya existe: ${model.name}`);
            }
          }
        } else {
          throw new Error('No se pudieron generar modelos a partir de la descripción');
        }
      }
      
      // Crear carpeta GraphQL si no existe
      const graphqlDir = path.join(outputPath, 'graphql');
      await fs.ensureDir(graphqlDir);
      
      console.log('\n📝 Generando archivos GraphQL...');
      
      // Datos del proyecto para la generación
      const projectData = {
        name: options.name || path.basename(outputPath),
        models: models,
        config: {
          database: options.database || 'MongoDB',
          auth: options.auth || 'JWT'
        }
      };
      
      // Generar los diferentes archivos de GraphQL
      const graphqlFiles = await this.templateProcessor.generateGraphQLAPI(projectData);
      
      // Escribir los archivos generados
      await fs.writeFile(path.join(graphqlDir, 'schema.graphql'), graphqlFiles.schema);
      console.log(`  ✓ Schema GraphQL creado`);
      
      await fs.writeFile(path.join(graphqlDir, 'resolvers.js'), graphqlFiles.resolvers);
      console.log(`  ✓ Resolvers creados`);
      
      await fs.writeFile(path.join(graphqlDir, 'server.js'), graphqlFiles.server);
      console.log(`  ✓ Servidor GraphQL creado`);
      
      // Archivos adicionales si fueron generados
      if (graphqlFiles.directives && graphqlFiles.directives !== '// No se pudieron generar directivas personalizadas') {
        await fs.writeFile(path.join(graphqlDir, 'directives.js'), graphqlFiles.directives);
        console.log(`  ✓ Directivas GraphQL creadas`);
      }
      
      if (graphqlFiles.scalars && graphqlFiles.scalars !== '// No se pudieron generar escalares personalizados') {
        await fs.writeFile(path.join(graphqlDir, 'scalars.js'), graphqlFiles.scalars);
        console.log(`  ✓ Escalares GraphQL creados`);
      }
      
      // Actualizar package.json para incluir dependencias de GraphQL
      await this._updatePackageWithGraphQL(outputPath);
      
      // Actualizar app.js principal para integrar GraphQL si existe
      await this._updateAppWithGraphQL(outputPath);
      
      console.log('\n🎉 API GraphQL generada con éxito!');
      console.log(`📁 Ubicación: ${graphqlDir}`);
      
      return {
        outputPath: graphqlDir,
        models,
        files: graphqlFiles
      };
    } catch (error) {
      console.error('\n❌ Error al generar API GraphQL:', error);
      throw error;
    }
  }
  
  /**
   * Genera código para un modelo compatible con GraphQL
   * @param {Object} model - Definición del modelo
   * @returns {Promise<string>} - Código del modelo
   * @private
   */
  async _generateModelCodeForGraphQL(model) {
    // Convertir los campos del modelo al formato que espera Mongoose
    const mongooseFields = model.fields.map(field => {
      // Mapear tipos de GraphQL a tipos de Mongoose
      let mongooseType = 'String';
      let ref = null;
      
      switch (field.type) {
        case 'ID':
          mongooseType = 'Schema.Types.ObjectId';
          break;
        case 'Int':
          mongooseType = 'Number';
          break;
        case 'Float':
          mongooseType = 'Number';
          break;
        case 'Boolean':
          mongooseType = 'Boolean';
          break;
        default:
          // Comprobar si es un tipo personalizado o una relación
          if (field.type.startsWith('[') && field.type.endsWith(']')) {
            // Es un array
            const innerType = field.type.substring(1, field.type.length - 1);
            if (['String', 'Int', 'Float', 'Boolean', 'ID'].includes(innerType)) {
              // Es un array de tipos primitivos
              switch (innerType) {
                case 'ID':
                  mongooseType = '[Schema.Types.ObjectId]';
                  break;
                case 'Int':
                case 'Float':
                  mongooseType = '[Number]';
                  break;
                default:
                  mongooseType = `[${innerType}]`;
              }
            } else {
              // Es un array de referencias
              mongooseType = '[Schema.Types.ObjectId]';
              ref = innerType;
            }
          } else if (!['String', 'Int', 'Float', 'Boolean', 'ID'].includes(field.type)) {
            // Es una referencia a otro modelo
            mongooseType = 'Schema.Types.ObjectId';
            ref = field.type;
          }
      }
      
      const fieldObj = {
        name: field.name,
        type: mongooseType,
        required: field.required || false
      };
      
      if (ref) {
        fieldObj.ref = ref;
      }
      
      return fieldObj;
    });
    
    // Generar el modelo con los campos convertidos
    const modelData = {
      modelName: model.name,
      fields: mongooseFields,
      methods: [],
      statics: []
    };
    
    return await this.templateProcessor.generateModel(modelData);
  }
  
  /**
   * Actualiza package.json para incluir dependencias de GraphQL
   * @param {string} outputPath - Ruta del proyecto
   * @returns {Promise<void>}
   * @private
   */
  async _updatePackageWithGraphQL(outputPath) {
    const packagePath = path.join(outputPath, 'package.json');
    
    // Verificar si existe package.json
    if (await fs.pathExists(packagePath)) {
      console.log('📦 Actualizando package.json con dependencias de GraphQL...');
      
      try {
        // Leer y parsear el package.json
        const packageJson = JSON.parse(await fs.readFile(packagePath, 'utf8'));
        
        // Dependencias de GraphQL
        const graphqlDeps = {
          'apollo-server-express': '^3.6.0',
          'apollo-server-core': '^3.6.0',
          'graphql': '^16.2.0',
          'graphql-scalars': '^1.14.1',
          'dataloader': '^2.0.0'
        };
        
        // Añadir dependencias si no existen
        packageJson.dependencies = packageJson.dependencies || {};
        let depsAdded = false;
        
        for (const [dep, version] of Object.entries(graphqlDeps)) {
          if (!packageJson.dependencies[dep]) {
            packageJson.dependencies[dep] = version;
            depsAdded = true;
          }
        }
        
        // Añadir scripts para GraphQL si no existen
        packageJson.scripts = packageJson.scripts || {};
        if (!packageJson.scripts['start:graphql']) {
          packageJson.scripts['start:graphql'] = 'node graphql/server.js';
          depsAdded = true;
        }
        
        // Guardar el package.json actualizado
        if (depsAdded) {
          await fs.writeFile(packagePath, JSON.stringify(packageJson, null, 2));
          console.log('  ✓ package.json actualizado con dependencias de GraphQL');
        } else {
          console.log('  ℹ️ package.json ya contiene dependencias de GraphQL');
        }
      } catch (error) {
        console.error('  ❌ Error al actualizar package.json:', error.message);
      }
    } else {
      console.log('  ⚠️ No se encontró package.json para actualizar');
      
      // Si no existe, crear uno básico con las dependencias necesarias
      const basicPackage = {
        name: path.basename(outputPath),
        version: '1.0.0',
        description: 'API GraphQL generada automáticamente',
        main: 'graphql/server.js',
        scripts: {
          'start': 'node graphql/server.js',
          'dev': 'nodemon graphql/server.js'
        },
        dependencies: {
          'apollo-server-express': '^3.6.0',
          'apollo-server-core': '^3.6.0',
          'express': '^4.17.2',
          'graphql': '^16.2.0',
          'mongoose': '^6.1.6',
          'dotenv': '^10.0.0',
          'graphql-scalars': '^1.14.1',
          'dataloader': '^2.0.0'
        }
      };
      
      await fs.writeFile(packagePath, JSON.stringify(basicPackage, null, 2));
      console.log('  ✓ package.json creado con dependencias de GraphQL');
    }
  }
  
  /**
   * Actualiza app.js para integrar GraphQL si existe
   * @param {string} outputPath - Ruta del proyecto
   * @returns {Promise<void>}
   * @private
   */
  async _updateAppWithGraphQL(outputPath) {
    const appPath = path.join(outputPath, 'app.js');
    
    // Verificar si existe app.js
    if (await fs.pathExists(appPath)) {
      console.log('🔄 Actualizando app.js para integrar GraphQL...');
      
      try {
        // Leer el contenido de app.js
        const appContent = await fs.readFile(appPath, 'utf8');
        
        // Verificar si ya incluye GraphQL
        if (appContent.includes('apollo') || appContent.includes('graphql')) {
          console.log('  ℹ️ app.js ya incluye integración con GraphQL');
          return;
        }
        
        // Buscar puntos de integración
        let updatedContent = appContent;
        
        // 1. Añadir importaciones necesarias
        if (updatedContent.includes('const express = require')) {
          updatedContent = updatedContent.replace(
            'const express = require(\'express\');',
            'const express = require(\'express\');\n' +
            '// Importar configuración de Apollo Server\n' +
            'const { startApolloServer } = require(\'./graphql/server\');'
          );
        }
        
        // 2. Añadir inicialización de Apollo Server
        if (updatedContent.includes('module.exports = app;')) {
          updatedContent = updatedContent.replace(
            'module.exports = app;',
            '// Iniciar Apollo Server para GraphQL\n' +
            'startApolloServer(app)\n' +
            '  .then(({ server }) => {\n' +
            '    console.log(`🚀 Servidor GraphQL listo en ${server.graphqlPath}`);\n' +
            '  })\n' +
            '  .catch(err => {\n' +
            '    console.error(\'Error al iniciar Apollo Server:\', err);\n' +
            '  });\n\n' +
            'module.exports = app;'
          );
        } else if (updatedContent.includes('app.listen(')) {
          // Si hay un app.listen, reemplazarlo con la versión de Apollo
          const listenRegex = /(app\.listen\(\s*.*\s*,\s*.*\s*\{[\s\S]*?\}\);)/;
          const listenMatch = updatedContent.match(listenRegex);
          
          if (listenMatch) {
            updatedContent = updatedContent.replace(
              listenMatch[0],
              '// Iniciar Apollo Server para GraphQL\n' +
              'startApolloServer(app)\n' +
              '  .then(({ server, httpServer }) => {\n' +
              '    console.log(`🚀 Servidor GraphQL listo en ${server.graphqlPath}`);\n' +
              '  })\n' +
              '  .catch(err => {\n' +
              '    console.error(\'Error al iniciar Apollo Server:\', err);\n' +
              '  });'
            );
          }
        }
        
        // Guardar el archivo actualizado
        await fs.writeFile(appPath, updatedContent);
        console.log('  ✓ app.js actualizado para integrar GraphQL');
      } catch (error) {
        console.error('  ❌ Error al actualizar app.js:', error.message);
      }
    } else {
      console.log('  ℹ️ No se encontró app.js para integrar GraphQL');
    }
  }
  
  /**
   * Extrae el nombre del modelo de un archivo de modelo existente
   * @param {string} modelContent - Contenido del archivo de modelo
   * @returns {string|null} - Nombre del modelo o null
   * @private
   */
  _extractModelName(modelContent) {
    // Buscar definición de modelo como "const UserSchema = new mongoose.Schema"
    const schemaMatch = modelContent.match(/const\s+(\w+)Schema\s*=\s*new\s+mongoose\.Schema/);
    if (schemaMatch) {
      return schemaMatch[1];
    }
    
    // Buscar "const User = mongoose.model('User'"
    const modelMatch = modelContent.match(/const\s+(\w+)\s*=\s*mongoose\.model\s*\(\s*['"](\w+)['"]/);
    if (modelMatch) {
      return modelMatch[2]; // Usar el nombre entre comillas
    }
    
    return null;
  }
  
  /**
   * Extrae los campos de un archivo de modelo existente
   * @param {string} modelContent - Contenido del archivo de modelo
   * @returns {Array} - Array de objetos con los campos
   * @private
   */
  _extractModelFields(modelContent) {
    const fields = [];
    
    try {
      // Buscar el objeto de esquema
      const schemaMatch = modelContent.match(/new\s+mongoose\.Schema\s*\(\s*\{([\s\S]*?)\}\s*,/);
      if (!schemaMatch) return fields;
      
      const schemaContent = schemaMatch[1];
      
      // Buscar campos individuales en el formato: fieldName: { type: Type, ... }
      const fieldRegex = /(\w+)\s*:\s*\{([\s\S]*?)\}/g;
      let match;
      
      while ((match = fieldRegex.exec(schemaContent)) !== null) {
        const fieldName = match[1];
        const fieldContent = match[2];
        
        // Determinar el tipo del campo
        let fieldType = 'String'; // Tipo predeterminado
        
        // Buscar tipo: type: String, type: Number, etc.
        const typeMatch = fieldContent.match(/type\s*:\s*([\w\.]+)/);
        if (typeMatch) {
          // Mapear tipos Mongoose a GraphQL
          const mongooseType = typeMatch[1];
          switch (mongooseType) {
            case 'String':
              fieldType = 'String';
              break;
            case 'Number':
              fieldType = 'Float';
              break;
            case 'Boolean':
              fieldType = 'Boolean';
              break;
            case 'Date':
              fieldType = 'String'; // Usar String para fechas en GraphQL
              break;
            case 'Schema.Types.ObjectId':
            case 'mongoose.Schema.Types.ObjectId':
              // Buscar referencia
              const refMatch = fieldContent.match(/ref\s*:\s*['"]([\w]+)['"]/);
              if (refMatch) {
                fieldType = refMatch[1]; // Tipo es el nombre del modelo referenciado
              } else {
                fieldType = 'ID';
              }
              break;
            default:
              // Arrays o tipos personalizados
              if (mongooseType.includes('[')) {
                fieldType = '[String]'; // Predeterminado para arrays
              } else {
                fieldType = 'String';
              }
          }
        }
        
        // Determinar si es requerido
        const isRequired = fieldContent.includes('required: true');
        
        fields.push({
          name: fieldName,
          type: fieldType,
          required: isRequired
        });
      }
    } catch (error) {
      console.error('Error al extraer campos del modelo:', error);
    }
    
    return fields;
  }
}

module.exports = ProjectGenerator;

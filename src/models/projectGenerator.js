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
   * Genera un backend completo que incluye:
   * - Estructura de carpetas y archivos
   * - Código generado por IA
   * - Diagrama guardado en MongoDB
   * @param {string} description - Descripción del backend
   * @param {string} outputPath - Ruta donde se generará el backend
   * @param {Object} options - Opciones adicionales (nombre, base de datos, framework, etc.)
   * @returns {Promise<Object>} - Resultado con la arquitectura y diagrama generados
   */
  async generateCompleteProject(description, outputPath, options = {}) {
    try {
      // Intentar cargar el estado de recuperación si existe
      const recoveryPath = path.join(outputPath, '.recovery.json');
      let recoveryState = null;
      let architecture = null;
      let fileCounter = 0;
      let continueGeneration = false;
      let generatedFiles = [];
      
      if (await fs.pathExists(recoveryPath)) {
        try {
          recoveryState = JSON.parse(await fs.readFile(recoveryPath, 'utf8'));
          console.log('\n🔄 Detectado estado de recuperación. ¿Desea continuar la generación interrumpida?');
          console.log(`   Proyecto: ${recoveryState.projectName}`);
          console.log(`   Progreso: ${recoveryState.fileCounter}/${recoveryState.totalFiles} archivos generados`);
          
          // En una implementación real, aquí preguntaríamos al usuario
          // Por ahora, asumiremos que sí quiere continuar
          continueGeneration = true;
          
          if (continueGeneration) {
            console.log('\n✅ Continuando la generación desde el punto de interrupción...');
            architecture = recoveryState.architecture;
            fileCounter = recoveryState.fileCounter;
            generatedFiles = recoveryState.generatedFiles || [];
          } else {
            console.log('\n🔄 Comenzando nueva generación. Se ignorará el estado anterior...');
            await fs.remove(recoveryPath);
          }
        } catch (error) {
          console.warn('Error al leer el archivo de recuperación:', error.message);
          console.log('Comenzando nueva generación...');
        }
      }
      
      console.log('\n🚀 Iniciando generación de proyecto completo...');
      console.log(`📝 Nombre: "${options.name || path.basename(outputPath)}"`);
      console.log(`📋 Descripción: "${description}"`);
      
      // FASE 1: Generar y validar la arquitectura JSON antes de crear archivos (si no estamos recuperando)
      if (!architecture) {
        console.log('\n📊 Fase 1: Analizando requisitos y generando estructura JSON...');
        
        const architecturePrompt = `
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

          Responde ÚNICAMENTE con un objeto JSON.
        `;
        
        console.log('🧠 Consultando al modelo de IA para diseñar la arquitectura...');
        console.log('   (Este proceso puede tardar hasta 30 segundos)');
        
        try {
          architecture = await this.agent.generateArchitecture(architecturePrompt);
          architecture = await this.agent.validateArchitecture(architecture, description);
        } catch (error) {
          console.error('\n❌ Error al generar arquitectura:', error.message);
          console.log('Intentando cargar arquitectura predeterminada...');
          architecture = this._getDefaultArchitecture(description, options);
        }
        
        console.log('✅ Arquitectura JSON generada y validada correctamente');
        console.log(`📂 Total de carpetas: ${architecture.folders.length}`);
        console.log(`📄 Total de archivos: ${architecture.files.length}`);
      } else {
        console.log(`📂 Arquitectura recuperada: ${architecture.folders.length} carpetas, ${architecture.files.length} archivos`);
      }
      
      // Guardar estado para recuperación después de cada fase importante
      await this._saveRecoveryState(recoveryPath, {
        projectName: options.name || path.basename(outputPath),
        description,
        architecture,
        fileCounter,
        totalFiles: architecture.files.length,
        options,
        phase: 'architecture_ready',
        generatedFiles
      });
      
      // FASE 2: Crear estructura de carpetas
      console.log('\n📁 Fase 2: Creando estructura de carpetas...');
      for (const folder of architecture.folders) {
        const folderPath = path.join(outputPath, folder.path);
        await fs.ensureDir(folderPath);
        console.log(`   ✓ ${folderPath}`);
      }
      
      // Contexto enriquecido para la generación del código
      const context = {
        ...options,
        description,
        projectName: options.name || path.basename(outputPath),
        language: options.language || 'JavaScript',
        database: options.database || 'MongoDB',
        framework: options.framework || 'Express',
        auth: options.auth || 'JWT',
        folders: architecture.folders,
        files: architecture.files
      };
      
      // FASE 3: Analizar modelos y rutas
      console.log('\n🔍 Fase 3: Analizando modelos y rutas del proyecto...');
      const modelFiles = [];
      const routes = [];
      
      // Identificar modelos
      for (const file of architecture.files) {
        if (this._getFileTypeFromPath(file.path) === 'model') {
          const modelName = this._getModelNameFromPath(file.path);
          modelFiles.push({
            name: modelName,
            path: file.path,
            description: file.description,
            useTemplate: file.useTemplate || false
          });
          console.log(`   ✓ Modelo identificado: ${modelName}${file.useTemplate ? ' (plantilla)' : ''}`);
        } else if (this._getFileTypeFromPath(file.path) === 'route') {
          const routeName = path.basename(file.path, '.js');
          routes.push({
            path: routeName,
            file: routeName,
            useTemplate: file.useTemplate || false
          });
          console.log(`   ✓ Ruta identificada: ${routeName}${file.useTemplate ? ' (plantilla)' : ''}`);
        }
      }
      
      // Agregar información de modelos al contexto
      context.models = modelFiles;
      context.routes = routes;
      
      // Guardar estado para recuperación
      await this._saveRecoveryState(recoveryPath, {
        projectName: options.name || path.basename(outputPath),
        description,
        architecture,
        fileCounter,
        totalFiles: architecture.files.length,
        options,
        context,
        phase: 'models_analyzed',
        generatedFiles
      });
      
      // FASE 4: Generar archivos basados en plantillas o IA según la configuración
      console.log('\n📝 Fase 4: Generando archivos del proyecto...');
      const useTemplates = options.useTemplates !== false; // Usar plantillas por defecto
      console.log(`   Usando plantillas CRUD: ${useTemplates ? 'Sí' : 'No'}`);
      
      const totalFiles = architecture.files.length;
      
      // Si estamos recuperando la generación, mostramos el progreso actual
      if (continueGeneration && fileCounter > 0) {
        console.log(`   Continuando desde el archivo ${fileCounter+1}/${totalFiles}`);
      }
      
      // Organizamos los archivos por categoría para una generación ordenada
      const configFiles = architecture.files.filter(file => {
        return file.path.includes('config/') || 
               file.path.includes('package.json') || 
               file.path.includes('.env') ||
               file.path.includes('app.js') ||
               file.path.includes('middleware/');
      });
      
      const modelFilesToCreate = architecture.files.filter(file => 
        this._getFileTypeFromPath(file.path) === 'model'
      );
      
      const controllerFiles = architecture.files.filter(file => 
        this._getFileTypeFromPath(file.path) === 'controller'
      );
      
      const routeFiles = architecture.files.filter(file => 
        this._getFileTypeFromPath(file.path) === 'route'
      );
      
      const remainingFiles = architecture.files.filter(file => {
        return !configFiles.includes(file) && 
               !modelFilesToCreate.includes(file) && 
               !controllerFiles.includes(file) && 
               !routeFiles.includes(file);
      });
      
      // Función para generar archivos por categoría con manejo de errores
      const generateFileCategory = async (files, categoryName, startIndex = 0) => {
        console.log(`\n${categoryName}...`);
        for (let i = startIndex; i < files.length; i++) {
          const file = files[i];
          fileCounter++;
          
          try {
            const filePath = await this._generateFile(file, outputPath, context, useTemplates && file.useTemplate, fileCounter, totalFiles);
            if (filePath) generatedFiles.push(filePath);
            
            // Guardar estado después de cada archivo para poder recuperar
            await this._saveRecoveryState(recoveryPath, {
              projectName: options.name || path.basename(outputPath),
              description,
              architecture,
              fileCounter,
              totalFiles,
              options,
              context,
              phase: 'generating_files',
              currentCategory: categoryName,
              currentCategoryIndex: i,
              generatedFiles
            });
          } catch (error) {
            console.error(`\n❌ Error al generar archivo ${file.path}:`, error.message);
            console.log('Guardando estado para recuperación posterior...');
            
            await this._saveRecoveryState(recoveryPath, {
              projectName: options.name || path.basename(outputPath),
              description,
              architecture,
              fileCounter,
              totalFiles,
              options,
              context,
              phase: 'generating_files',
              currentCategory: categoryName,
              currentCategoryIndex: i,
              lastError: error.message,
              generatedFiles
            });
            
            if (options.continueOnError) {
              console.log('Continuando con el siguiente archivo...');
              continue;
            } else {
              console.log('\n⚠️ La generación se ha interrumpido.');
              console.log('Para continuar más tarde, ejecute el mismo comando.');
              return false;
            }
          }
        }
        return true;
      };
      
      // Determinar desde dónde continuar si estamos recuperando
      let startConfig = 0, startModels = 0, startControllers = 0, startRoutes = 0, startRemaining = 0;
      
      if (continueGeneration && recoveryState) {
        const { currentCategory, currentCategoryIndex } = recoveryState;
        if (currentCategory) {
          if (currentCategory.includes('configuración')) startConfig = currentCategoryIndex + 1;
          else if (currentCategory.includes('modelos')) startModels = currentCategoryIndex + 1;
          else if (currentCategory.includes('controladores')) startControllers = currentCategoryIndex + 1;
          else if (currentCategory.includes('rutas')) startRoutes = currentCategoryIndex + 1;
          else if (currentCategory.includes('adicionales')) startRemaining = currentCategoryIndex + 1;
        }
      }
      
      // Generar archivos por orden de importancia
      let success = true;
      if (success && startConfig < configFiles.length) 
        success = await generateFileCategory(configFiles, '🔧 Generando archivos de configuración', startConfig);
      
      if (success && startModels < modelFilesToCreate.length) 
        success = await generateFileCategory(modelFilesToCreate, '📦 Generando modelos', startModels);
      
      if (success && startControllers < controllerFiles.length) 
        success = await generateFileCategory(controllerFiles, '🎮 Generando controladores', startControllers);
      
      if (success && startRoutes < routeFiles.length) 
        success = await generateFileCategory(routeFiles, '🛣️ Generando rutas', startRoutes);
      
      if (success && startRemaining < remainingFiles.length) 
        success = await generateFileCategory(remainingFiles, '📄 Generando archivos adicionales', startRemaining);
      
      // Añadir globalQuery si está habilitado y no existe
      if (success && options.includeGlobalQuery) {
        let globalQueryExists = architecture.files.some(file => 
          file.path.includes('globalQuery.js') || file.path.includes('global-query.js')
        );
        
        if (!globalQueryExists) {
          console.log('\n🔄 Generando archivo de consulta global...');
          try {
            const globalQueryPath = path.join(outputPath, 'routes/globalQuery.js');
            const globalQueryCode = await this.templateProcessor.generateGlobalQuery();
            
            await fs.ensureDir(path.dirname(globalQueryPath));
            await fs.writeFile(globalQueryPath, globalQueryCode);
            console.log(`   ✅ Archivo creado: ${globalQueryPath}`);
            
            // Actualizar app.js para incluir la ruta global
            await this._updateAppWithGlobalQuery(outputPath);
            generatedFiles.push(globalQueryPath);
          } catch (error) {
            console.error('\n❌ Error al generar globalQuery:', error.message);
            if (!options.continueOnError) {
              success = false;
            }
          }
        }
      }
      
      // Si hemos llegado hasta aquí con éxito, guardar estado como completado
      if (success) {
        await this._saveRecoveryState(recoveryPath, {
          projectName: options.name || path.basename(outputPath),
          description,
          architecture,
          fileCounter,
          totalFiles,
          options,
          phase: 'files_generated',
          generatedFiles,
          completed: true
        });
      }
      
      // FASE 5: Comprobar si se requieren modificaciones antes de finalizar
      if (success && options.allowPreviewEdit === true) {
        console.log('\n✏️ Fase 5: Edición previa a la finalización');
        
        // Aquí se podría implementar una interfaz para editar archivos
        console.log('   Edición manual habilitada. Puede editar los archivos generados antes de continuar.');
        console.log('   Archivos generados disponibles en:', outputPath);
        
        // En una implementación real, aquí habría una pausa para permitir ediciones
      }
      
      // FASE 6: Generar diagrama y guardar en MongoDB
      let diagramId = null;
      let diagram = null;
      
      console.log('\n📊 Fase 6: Generando diagrama y guardando en MongoDB...');
      
      try {
        // Generar diagrama visual
        diagram = await this.diagramService.generateDiagram(architecture);
        
        // Intentar guardar en MongoDB
        try {
          // Guardar en MongoDB
          const projectName = options.name || path.basename(outputPath);
          const savedDiagram = await this.diagramService.saveDiagram({
            name: projectName,
            description,
            architecture,
            diagram,
            outputPath,
            options
          });
          
          diagramId = savedDiagram._id;
          console.log('🗄️ Diagrama guardado correctamente en MongoDB.');
        } catch (dbError) {
          console.error('⚠️ No se pudo guardar el diagrama en MongoDB:', dbError.message);
          console.log('   Continuando sin persistencia en base de datos...');
          
          // Guardar localmente como respaldo
          const diagramPath = path.join(outputPath, 'diagram.json');
          await fs.writeJson(diagramPath, { 
            architecture, 
            diagram,
            createdAt: new Date().toISOString()
          }, { spaces: 2 });
          console.log(`   ✅ Diagrama guardado localmente en: ${diagramPath}`);
        }
      } catch (diagramError) {
        console.error('⚠️ Error al generar diagrama:', diagramError.message);
        console.log('   Continuando sin generación de diagrama...');
      }
      
      // FASE 7: Generar archivo ZIP si se solicita
      let zipPath = null;
      if (options.generateZip) {
        console.log('\n📦 Fase 7: Generando archivo ZIP del proyecto...');
        try {
          zipPath = await this.agent.generateProjectZip(outputPath, `${options.name || path.basename(outputPath)}.zip`);
        } catch (zipError) {
          console.error('⚠️ Error al generar archivo ZIP:', zipError.message);
          console.log('   Continuando sin generar ZIP...');
        }
      }
      
      // Eliminar archivo de recuperación si todo se completó correctamente
      if (success) {
        try {
          await fs.remove(recoveryPath);
          console.log('\n✅ Generación completada exitosamente.');
        } catch (unlinkError) {
          console.warn('No se pudo eliminar el archivo de recuperación:', unlinkError.message);
        }
      }
      
      console.log('\n🎉 Proyecto generado con éxito!');
      console.log(`📁 Ubicación: ${outputPath}`);
      if (zipPath) {
        console.log(`🗜️ Archivo ZIP: ${zipPath}`);
      }
      
      return {
        architecture,
        diagram,
        diagramId,
        outputPath,
        zipPath,
        generatedFiles,
        success
      };
    } catch (error) {
      console.error('\n❌ Error al generar proyecto completo:', error);
      throw error;
    }
  }
  
  /**
   * Guarda el estado actual de la generación para recuperación
   * @param {string} recoveryPath - Ruta del archivo de recuperación
   * @param {Object} state - Estado de la generación
   * @returns {Promise<void>}
   * @private
   */
  async _saveRecoveryState(recoveryPath, state) {
    try {
      // Añadir timestamp
      state.timestamp = new Date().toISOString();
      await fs.writeJson(recoveryPath, state, { spaces: 2 });
    } catch (error) {
      console.warn('No se pudo guardar el estado de recuperación:', error.message);
    }
  }
  
  /**
   * Obtiene una arquitectura predeterminada para casos de error
   * @param {string} description - Descripción del proyecto
   * @param {Object} options - Opciones de configuración
   * @returns {Object} Arquitectura por defecto
   * @private
   */
  _getDefaultArchitecture(description, options) {
    const projectType = this._detectProjectType(description);
    
    // Arquitectura básica predeterminada
    const architecture = {
      folders: [
        { path: 'src', description: 'Código fuente del proyecto' },
        { path: 'src/models', description: 'Modelos de datos' },
        { path: 'src/controllers', description: 'Controladores de la API' },
        { path: 'src/routes', description: 'Rutas de la API' },
        { path: 'src/middlewares', description: 'Middlewares' },
        { path: 'src/config', description: 'Configuración de la aplicación' },
        { path: 'src/utils', description: 'Utilidades y helpers' }
      ],
      files: [
        { path: 'package.json', description: 'Configuración del proyecto', useTemplate: true, templateType: 'config' },
        { path: '.env.example', description: 'Variables de entorno de ejemplo', useTemplate: true, templateType: 'config' },
        { path: 'src/app.js', description: 'Aplicación principal', useTemplate: true, templateType: 'main' },
        { path: 'src/server.js', description: 'Servidor de la aplicación', useTemplate: true, templateType: 'config' },
        { path: 'src/config/database.js', description: 'Configuración de la base de datos', useTemplate: true, templateType: 'config' },
        { path: 'src/middlewares/authMiddleware.js', description: 'Middleware de autenticación', useTemplate: true, templateType: 'middleware' },
        { path: 'src/middlewares/errorMiddleware.js', description: 'Middleware de manejo de errores', useTemplate: true, templateType: 'middleware' },
        { path: 'README.md', description: 'Documentación del proyecto', useTemplate: false }
      ]
    };
    
    // Añadir archivos según el tipo de proyecto detectado
    if (projectType) {
      projectType.entities.forEach(entity => {
        // Modelo
        architecture.files.push({
          path: `src/models/${entity.toLowerCase()}.js`,
          description: `Modelo para ${entity}`,
          useTemplate: true,
          templateType: 'model'
        });
        
        // Controlador
        architecture.files.push({
          path: `src/controllers/${entity.toLowerCase()}Controller.js`,
          description: `Controlador para ${entity}`,
          useTemplate: true,
          templateType: 'controller'
        });
        
        // Ruta
        architecture.files.push({
          path: `src/routes/${entity.toLowerCase()}Routes.js`,
          description: `Rutas para ${entity}`,
          useTemplate: true,
          templateType: 'route'
        });
      });
    } else {
      // Añadir un modelo, controlador y ruta genéricos si no se detectó ningún tipo
      architecture.files.push({
        path: 'src/models/item.js',
        description: 'Modelo genérico',
        useTemplate: true,
        templateType: 'model'
      });
      
      architecture.files.push({
        path: 'src/controllers/itemController.js',
        description: 'Controlador genérico',
        useTemplate: true,
        templateType: 'controller'
      });
      
      architecture.files.push({
        path: 'src/routes/itemRoutes.js',
        description: 'Rutas genéricas',
        useTemplate: true,
        templateType: 'route'
      });
    }
    
    // Añadir globalQuery si está habilitado
    if (options.includeGlobalQuery) {
      architecture.files.push({
        path: 'src/routes/globalQuery.js',
        description: 'Consulta global para administradores',
        useTemplate: true,
        templateType: 'route'
      });
    }
    
    return architecture;
  }
  
  /**
   * Detecta el tipo de proyecto y entidades principales basado en la descripción
   * @param {string} description - Descripción del proyecto
   * @returns {Object|null} - Tipo de proyecto detectado o null
   * @private
   */
  _detectProjectType(description) {
    const desc = description.toLowerCase();
    
    // Tipos comunes de proyectos
    const types = [
      {
        type: 'ecommerce',
        keywords: ['ecommerce', 'tienda', 'venta', 'producto', 'carrito', 'compra'],
        entities: ['Producto', 'Usuario', 'Pedido', 'Categoria']
      },
      {
        type: 'blog',
        keywords: ['blog', 'artículo', 'post', 'comentario', 'autor'],
        entities: ['Articulo', 'Usuario', 'Comentario', 'Categoria']
      },
      {
        type: 'cms',
        keywords: ['cms', 'contenido', 'página', 'administración'],
        entities: ['Pagina', 'Usuario', 'Media', 'Seccion']
      },
      {
        type: 'booking',
        keywords: ['reserva', 'hotel', 'viaje', 'habitación', 'reservación'],
        entities: ['Reserva', 'Usuario', 'Habitacion', 'Hotel']
      },
      {
        type: 'inventory',
        keywords: ['inventario', 'stock', 'almacén', 'producto'],
        entities: ['Producto', 'Categoria', 'Proveedor', 'Stock']
      }
    ];
    
    // Buscar coincidencias
    for (const type of types) {
      if (type.keywords.some(keyword => desc.includes(keyword))) {
        return type;
      }
    }
    
    return null;
  }

  /**
   * Carga un proyecto desde MongoDB por nombre y lo regenera
   * @param {string} projectName - Nombre del proyecto
   * @param {string} outputPath - Ruta donde regenerar el proyecto (opcional)
   * @returns {Promise<Object>} - Resultado de la regeneración
   */
  async regenerateProjectFromDiagram(projectName, outputPath = null) {
    try {
      console.log(`Buscando proyecto "${projectName}" en MongoDB...`);
      
      // Buscar diagrama en MongoDB
      const savedProject = await this.diagramService.findDiagramByName(projectName);
      
      if (!savedProject) {
        throw new Error(`No se encontró un proyecto con el nombre "${projectName}"`);
      }
      
      // Determinar ruta de salida
      const targetPath = outputPath || savedProject.outputPath || path.join(process.cwd(), projectName);
      
      console.log(`Regenerando proyecto en: ${targetPath}`);
      
      // Generar estructura y archivos
      const result = await this.generateBackend(
        savedProject.description,
        targetPath,
        savedProject.options
      );
      
      return {
        architecture: result.architecture,
        outputPath: targetPath,
        diagram: savedProject.diagram,
        diagramId: savedProject._id
      };
    } catch (error) {
      console.error('Error al regenerar proyecto desde diagrama:', error);
      throw error;
    }
  }

  /**
   * Obtiene una lista de proyectos recientes
   * @param {number} limit - Número máximo de proyectos a obtener
   * @returns {Promise<Array>} - Lista de proyectos
   */
  async getRecentProjects(limit = 10) {
    try {
      return await this.diagramService.getRecentDiagrams(limit);
    } catch (error) {
      console.error('Error al obtener proyectos recientes:', error);
      throw error;
    }
  }

  /**
   * Genera un webhook para un servicio específico
   * @param {string} serviceName - Nombre del servicio (WhatsApp, Twitch, etc.)
   * @param {string} outputPath - Ruta donde se generará el webhook
   * @param {Object} options - Opciones adicionales
   * @returns {Promise<Object>} - Información del webhook generado
   */
  async generateWebhook(serviceName, outputPath, options = {}) {
    try {
      console.log(`Generando webhook para ${serviceName}...`);
      
      // Obtener configuración del webhook basada en el servicio
      const webhookConfig = await this.templateProcessor.generateWebhookConfig(serviceName);
      
      // Preparar rutas de archivos
      const webhooksDir = path.join(outputPath, 'routes', 'webhooks');
      const webhookFileName = `${webhookConfig.serviceName.toLowerCase()}Webhook.js`;
      const webhookFilePath = path.join(webhooksDir, webhookFileName);
      
      // Crear directorio para webhooks si no existe
      await fs.ensureDir(webhooksDir);
      
      // Generar el código del webhook
      const webhookCode = await this.templateProcessor.generateWebhook(webhookConfig);
      
      // Escribir el archivo
      await fs.writeFile(webhookFilePath, webhookCode);
      console.log(`Webhook creado: ${webhookFilePath}`);
      
      // Actualizar app.js para incluir el webhook
      await this._updateAppWithWebhook(outputPath, webhookConfig);
      
      // Actualizar .env.example con variables necesarias para el webhook
      await this._updateEnvWithWebhook(outputPath, webhookConfig);
      
      console.log(`Webhook para ${serviceName} generado con éxito.`);
      return { webhookPath: webhookFilePath, serviceName: webhookConfig.serviceName };
    } catch (error) {
      console.error(`Error al generar webhook para ${serviceName}:`, error);
      throw error;
    }
  }
  
  /**
   * Actualiza app.js para incluir la ruta del webhook
   * @param {string} outputPath - Ruta del proyecto
   * @param {Object} webhookConfig - Configuración del webhook
   * @returns {Promise<void>}
   * @private
   */
  async _updateAppWithWebhook(outputPath, webhookConfig) {
    const appPath = path.join(outputPath, 'app.js');
    if (await fs.exists(appPath)) {
      // Leer contenido actual
      let appContent = await fs.readFile(appPath, 'utf8');
      
      // Verificar si ya incluye la importación para webhooks
      if (!appContent.includes('webhooks')) {
        // Añadir la ruta para webhooks
        const routePath = `/api/webhooks/${webhookConfig.serviceName.toLowerCase()}`;
        const requirePath = `./routes/webhooks/${webhookConfig.serviceName.toLowerCase()}Webhook`;
        
        // Buscar dónde insertar la nueva ruta
        const routesSection = appContent.match(/\/\/ Rutas[\s\S]*?(app\.use|module\.exports)/);
        
        if (routesSection) {
          const updatedContent = appContent.replace(
            routesSection[0],
            `${routesSection[0].replace(routesSection[1], '')}\napp.use('${routePath}', require('${requirePath}'));\n\n${routesSection[1]}`
          );
          
          await fs.writeFile(appPath, updatedContent);
          console.log(`App.js actualizado con la ruta del webhook: ${routePath}`);
        } else {
          console.log('No se pudo encontrar la sección de rutas en app.js para actualizar');
        }
      } else {
        console.log('App.js ya incluye rutas para webhooks');
      }
    } else {
      console.log('No se encontró app.js para actualizar');
    }
  }
  
  /**
   * Actualiza .env.example con variables necesarias para el webhook
   * @param {string} outputPath - Ruta del proyecto
   * @param {Object} webhookConfig - Configuración del webhook
   * @returns {Promise<void>}
   * @private
   */
  async _updateEnvWithWebhook(outputPath, webhookConfig) {
    const envPath = path.join(outputPath, '.env.example');
    
    // Variables a añadir
    const envVars = [];
    
    // Si requiere token de verificación, añadir variable
    if (webhookConfig.verificationToken) {
      envVars.push(`# Token para webhook de ${webhookConfig.serviceName}`);
      envVars.push(`${webhookConfig.serviceName.toUpperCase()}_WEBHOOK_SECRET=your_webhook_secret_here`);
    }
    
    // Si no hay variables para añadir, no hacer nada
    if (envVars.length === 0) {
      return;
    }
    
    // Si existe el archivo, añadir variables
    if (await fs.exists(envPath)) {
      const envContent = await fs.readFile(envPath, 'utf8');
      
      // Verificar si ya incluye las variables
      if (!envContent.includes(`${webhookConfig.serviceName.toUpperCase()}_WEBHOOK_SECRET`)) {
        const updatedContent = `${envContent}\n\n${envVars.join('\n')}\n`;
        await fs.writeFile(envPath, updatedContent);
        console.log(`Variables de entorno para webhook añadidas a .env.example`);
      } else {
        console.log('Variables de entorno para webhook ya existen en .env.example');
      }
    } else {
      // Si no existe, crear el archivo
      await fs.writeFile(envPath, envVars.join('\n') + '\n');
      console.log(`Archivo .env.example creado con variables para webhook`);
    }
  }
  
  /**
   * Interpreta la solicitud de un usuario y genera el componente apropiado
   * @param {string} request - Solicitud del usuario en lenguaje natural
   * @param {string} outputPath - Ruta donde se generará el proyecto
   * @param {Object} options - Opciones adicionales
   * @returns {Promise<Object>} - Resultado de la operación
   */
  async processNaturalLanguageRequest(request, outputPath, options = {}) {
    try {
      console.log(`Procesando solicitud: "${request}"`);
      
      // Analizar la solicitud con el agente de IA
      const analysisPrompt = `
        Analiza la siguiente solicitud del usuario y determina qué acción desea realizar:
        "${request}"
        
        Posibles categorías:
        1. Generar un proyecto completo o backend (identifica el tipo de proyecto)
        2. Añadir un webhook (identifica el servicio, ej: WhatsApp, Twitch, Stripe)
        3. Regenerar un proyecto existente (identifica el nombre)
        4. Añadir un modelo específico
        5. Añadir una funcionalidad específica
        
        Retorna SOLO un objeto JSON con la información extraída, sin explicaciones adicionales.
        Ejemplo: { "action": "webhook", "service": "WhatsApp" }
        Otro ejemplo: { "action": "generateProject", "type": "backend", "name": "ecommerce-api" }
      `;
      
      const analysisJson = await this.agent.generateCode(
        'request_analysis',
        analysisPrompt,
        { request }
      );
      
      // Extraer el objeto JSON de la respuesta
      const jsonMatch = analysisJson.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No se pudo interpretar la solicitud');
      }
      
      const analysis = JSON.parse(jsonMatch[0]);
      
      // Ejecutar la acción apropiada según el análisis
      switch (analysis.action) {
        case 'webhook':
          if (!analysis.service) {
            throw new Error('No se pudo determinar el servicio para el webhook');
          }
          return await this.generateWebhook(analysis.service, outputPath, options);
          
        case 'generateProject':
        case 'backend':
          return await this.generateCompleteProject(
            analysis.description || request,
            outputPath,
            { 
              ...options, 
              ...analysis.options,
              name: analysis.name || path.basename(outputPath)
            }
          );
          
        case 'regenerateProject':
          if (!analysis.name) {
            throw new Error('No se pudo determinar el nombre del proyecto a regenerar');
          }
          return await this.regenerateProjectFromDiagram(analysis.name, outputPath);
          
        // Añadir más casos según sea necesario
          
        default:
          throw new Error(`Acción no soportada: ${analysis.action}`);
      }
    } catch (error) {
      console.error('Error al procesar solicitud en lenguaje natural:', error);
      throw error;
    }
  }

  /**
   * Determina el tipo de archivo basado en su ruta
   * @param {string} filePath - Ruta del archivo
   * @returns {string|null} Tipo de archivo (model, controller, route) o null
   * @private
   */
  _getFileTypeFromPath(filePath) {
    const normalizedPath = filePath.toLowerCase();
    if (normalizedPath.includes('/models/') || normalizedPath.includes('\\models\\')) {
      return 'model';
    }
    if (normalizedPath.includes('/controllers/') || normalizedPath.includes('\\controllers\\')) {
      return 'controller';
    }
    if (normalizedPath.includes('/routes/') || normalizedPath.includes('\\routes\\')) {
      return 'route';
    }
    return null;
  }
  
  /**
   * Extrae el nombre del modelo de la ruta del archivo
   * @param {string} filePath - Ruta del archivo
   * @returns {string} Nombre del modelo en formato PascalCase
   * @private
   */
  _getModelNameFromPath(filePath) {
    const fileName = path.basename(filePath, path.extname(filePath));
    // Convertir a PascalCase (primera letra mayúscula)
    return fileName.charAt(0).toUpperCase() + fileName.slice(1);
  }
  
  /**
   * Extrae el nombre del archivo del modelo de la ruta
   * @param {string} filePath - Ruta del archivo
   * @returns {string} Nombre del archivo del modelo
   * @private
   */
  _getModelFileNameFromPath(filePath) {
    return path.basename(filePath, path.extname(filePath));
  }
  
  /**
   * Genera los campos para un modelo basado en la descripción
   * @param {string} modelDescription - Descripción del modelo
   * @param {Object} context - Contexto del proyecto
   * @returns {Promise<Array>} Array con los campos del modelo
   * @private
   */
  async _generateModelFields(modelDescription, context) {
    const prompt = `
      Basado en esta descripción: "${modelDescription}"
      
      Genera un array de campos para un modelo de mongoose.
      Cada campo debe tener las propiedades: name, type, required, unique y default (opcional).
      Los tipos válidos son: String, Number, Boolean, Date, ObjectId, etc.
      
      Retorna SOLO un array JSON válido sin explicaciones adicionales.
    `;
    
    try {
      const fieldsJson = await this.agent.generateCode(
        'model_fields', 
        prompt, 
        context
      );
      
      const fieldsMatch = fieldsJson.match(/\[[\s\S]*\]/);
      if (fieldsMatch) {
        return JSON.parse(fieldsMatch[0]);
      }
      
      return [];
    } catch (error) {
      console.error('Error al generar campos del modelo:', error);
      return [
        { name: 'name', type: 'String', required: true },
        { name: 'description', type: 'String', required: false },
        { name: 'createdAt', type: 'Date', default: 'Date.now' }
      ];
    }
  }
  
  /**
   * Genera métodos para un modelo basado en la descripción
   * @param {string} modelDescription - Descripción del modelo
   * @param {Object} context - Contexto del proyecto
   * @returns {Promise<Array>} Array con los métodos del modelo
   * @private
   */
  async _generateModelMethods(modelDescription, context) {
    const prompt = `
      Basado en esta descripción: "${modelDescription}"
      
      Sugiere nombres de métodos útiles para este modelo.
      Estos métodos serán implementados después.
      
      Retorna SOLO un array JSON con los nombres de los métodos, sin código de implementación.
      Ejemplo: ["findByName", "calculateTotal"]
    `;
    
    try {
      const methodsJson = await this.agent.generateCode(
        'model_methods', 
        prompt, 
        context
      );
      
      const methodsMatch = methodsJson.match(/\[[\s\S]*\]/);
      if (methodsMatch) {
        const methodNames = JSON.parse(methodsMatch[0]);
        return methodNames.map(name => ({ name }));
      }
      
      return [];
    } catch (error) {
      console.error('Error al generar métodos del modelo:', error);
      return [];
    }
  }
}

module.exports = ProjectGenerator;

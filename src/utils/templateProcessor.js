/**
 * Utilidad para procesar plantillas y generar código
 */
const Handlebars = require('handlebars');
const fs = require('fs-extra');
const path = require('path');
const DeepseekAgent = require('../agent/deepseekAgent');

class TemplateProcessor {
  constructor() {
    this.agent = new DeepseekAgent();
    // Rutas base para los templates
    this.templateBasePath = path.join(__dirname, '..', 'templates');
    this.hbsBasePath = path.join(this.templateBasePath, 'hbs');
  }

  /**
   * Procesa una plantilla con datos
   * @param {string} template - Contenido de la plantilla
   * @param {Object} data - Datos para compilar la plantilla
   * @returns {string} Código generado
   */
  static processTemplate(template, data) {
    try {
      const compiledTemplate = Handlebars.compile(template);
      return compiledTemplate(data);
    } catch (error) {
      console.error('Error al procesar plantilla:', error);
      throw error;
    }
  }

  /**
   * Carga una plantilla desde un archivo
   * @param {string} templatePath - Ruta del archivo de plantilla
   * @returns {string} Contenido de la plantilla
   */
  static async loadTemplate(templatePath) {
    try {
      const templateContent = await fs.readFile(templatePath, 'utf8');
      return templateContent;
    } catch (error) {
      console.error(`Error al cargar plantilla desde ${templatePath}:`, error);
      throw error;
    }
  }

  /**
   * Genera código a partir de una plantilla y datos
   * @param {string} templatePath - Ruta de la plantilla
   * @param {Object} data - Datos para la plantilla
   * @returns {string} Código generado
   */
  static async generateCode(templatePath, data) {
    const template = await this.loadTemplate(templatePath);
    return this.processTemplate(template, data);
  }

  /**
   * Carga una plantilla Handlebars desde la carpeta de templates
   * @param {string} templateType - Tipo de plantilla (backend, frontend, etc.)
   * @param {string} templateName - Nombre del archivo de plantilla sin extensión
   * @returns {Promise<string>} Contenido de la plantilla
   */
  async loadHbsTemplate(templateType, templateName) {
    try {
      const templatePath = path.join(this.hbsBasePath, templateType, `${templateName}.hbs`);
      return await fs.readFile(templatePath, 'utf8');
    } catch (error) {
      console.error(`Error al cargar plantilla HBS desde ${templateType}/${templateName}.hbs:`, error);
      // Si falla, intentamos cargar el antiguo formato
      try {
        const legacyTemplate = require(`../templates/${templateType}/${templateName}`);
        return legacyTemplate;
      } catch (legacyError) {
        console.error(`Error al cargar plantilla legacy:`, legacyError);
        throw error;
      }
    }
  }

  /**
   * Genera un modelo a partir de los datos de modelo
   * @param {Object} modelData - Datos del modelo (nombre, campos, etc.)
   * @returns {string} Código del modelo generado
   */
  async generateModel(modelData) {
    const template = await this.loadHbsTemplate('backend', 'model');
    
    // Intentar generar implementaciones de métodos con el agente de IA
    if (modelData.methods && modelData.methods.length) {
      for (const method of modelData.methods) {
        if (!method.implementation) {
          const prompt = `
            Implementa un método "${method.name}" para el modelo "${modelData.modelName}" con los siguientes campos:
            ${JSON.stringify(modelData.fields)}
            
            El método debe ser útil para la lógica de negocio de este modelo.
          `;
          
          try {
            const implementation = await this.agent.generateCode(
              `${modelData.modelName}.${method.name}`, 
              prompt, 
              { modelData }
            );
            method.implementation = implementation;
          } catch (error) {
            console.error(`Error al generar implementación para ${method.name}:`, error);
            method.implementation = '// Implementación pendiente';
          }
        }
      }
    }
    
    return TemplateProcessor.processTemplate(template, modelData);
  }

  /**
   * Genera un controlador a partir de los datos del modelo
   * @param {Object} controllerData - Datos del controlador
   * @returns {string} Código del controlador generado
   */
  async generateController(controllerData) {
    const template = await this.loadHbsTemplate('backend', 'controller');
    
    // Generar código adicional específico para este controlador con IA
    const aiCode = await this._generateAdditionalControllerCode(controllerData);
    
    // Reemplazar marcador con código IA
    const processedTemplate = TemplateProcessor.processTemplate(template, controllerData);
    return processedTemplate.replace('// [IA_GENERATED_CODE]', aiCode);
  }

  /**
   * Genera una ruta a partir de los datos del modelo
   * @param {Object} routeData - Datos de la ruta
   * @returns {string} Código de la ruta generada
   */
  async generateRoute(routeData) {
    const template = await this.loadHbsTemplate('backend', 'route');
    
    // Generar código adicional específico para estas rutas con IA
    const aiCode = await this._generateAdditionalRouteCode(routeData);
    
    // Reemplazar marcador con código IA
    const processedTemplate = TemplateProcessor.processTemplate(template, routeData);
    return processedTemplate.replace('// [IA_GENERATED_CODE]', aiCode);
  }
  
  /**
   * Genera código para la aplicación principal (app.js)
   * @param {Object} appData - Datos de la aplicación
   * @returns {string} Código de la aplicación generado
   */
  async generateApp(appData) {
    const template = await this.loadHbsTemplate('backend', 'app');
    
    // Generar código adicional para la aplicación
    const aiCode = await this._generateAdditionalAppCode(appData);
    
    // Reemplazar marcador con código IA
    const processedTemplate = TemplateProcessor.processTemplate(template, appData);
    return processedTemplate.replace('// [IA_GENERATED_CODE]', aiCode);
  }
  
  /**
   * Genera el código para el archivo globalQuery.js
   * @returns {Promise<string>} Código generado para la consulta global
   */
  async generateGlobalQuery() {
    try {
      // Cargar la plantilla globalQuery.hbs
      const template = await this.loadHbsTemplate('', 'globalQuery');
      
      // Generar código adicional específico para la consulta global con IA
      const aiCode = await this._generateAdditionalGlobalQueryCode();
      
      // Procesar la plantilla
      const processedTemplate = TemplateProcessor.processTemplate(template, {});
      
      // Reemplazar marcador con código IA
      return processedTemplate.replace('// [IA_GENERATED_CODE]', aiCode);
    } catch (error) {
      console.error('Error al generar código para globalQuery:', error);
      
      // Si hay error al cargar la plantilla, generar el código completamente con IA
      try {
        return await this.agent.generateCode(
          'routes/globalQuery.js',
          'Implementa un servicio de consulta global que permita a los administradores consultar cualquier modelo en la base de datos. Debe incluir autenticación, verificación de permisos de administrador, y capacidades para filtrar, paginar y ordenar resultados.',
          { isAdmin: true }
        );
      } catch (aiError) {
        console.error('Error al generar código para globalQuery con IA:', aiError);
        throw error;
      }
    }
  }
  
  /**
   * Genera código adicional para un controlador
   * @param {Object} controllerData - Datos del controlador
   * @returns {Promise<string>} Código adicional generado
   * @private
   */
  async _generateAdditionalControllerCode(controllerData) {
    try {
      const modelName = controllerData.modelName || 'modelo';
      const prompt = `
        Genera funciones adicionales útiles para un controlador de ${modelName}.
        
        Además de las operaciones CRUD básicas, incluye métodos para:
        - Búsquedas avanzadas o filtradas
        - Validaciones específicas para este modelo
        - Funcionalidad de negocio especializada
        - Cualquier otra función que consideres útil para un controlador de ${modelName}
        
        Retorna SOLO el código JavaScript (funciones adicionales) sin explicaciones.
      `;
      
      return await this.agent.generateCode(
        `controller_additional_${modelName}`,
        prompt,
        controllerData
      );
    } catch (error) {
      console.error('Error al generar código adicional para controlador:', error);
      return '// No se pudo generar código adicional';
    }
  }
  
  /**
   * Genera código adicional para una ruta
   * @param {Object} routeData - Datos de la ruta
   * @returns {Promise<string>} Código adicional generado
   * @private
   */
  async _generateAdditionalRouteCode(routeData) {
    try {
      const modelName = routeData.modelName || 'recurso';
      const prompt = `
        Genera rutas adicionales útiles para ${modelName}.
        
        Además de las rutas CRUD básicas, incluye endpoints para:
        - Búsquedas por diferentes parámetros
        - Operaciones por lotes (batch)
        - Exportación de datos a formatos como CSV o Excel
        - Rutas especializadas según la naturaleza de este modelo
        
        Retorna SOLO el código JavaScript (definiciones de rutas) sin explicaciones.
      `;
      
      return await this.agent.generateCode(
        `route_additional_${modelName}`,
        prompt,
        routeData
      );
    } catch (error) {
      console.error('Error al generar código adicional para ruta:', error);
      return '// No se pudo generar código adicional';
    }
  }
  
  /**
   * Genera código adicional para la aplicación principal
   * @param {Object} appData - Datos de la aplicación
   * @returns {Promise<string>} Código adicional generado
   * @private
   */
  async _generateAdditionalAppCode(appData) {
    try {
      const prompt = `
        Genera código adicional para la configuración de la aplicación Express.
        
        Incluye:
        - Configuración de seguridad (helmet, CORS, etc.)
        - Logging avanzado
        - Manejo de errores global
        - Monitoreo o métricas
        - Cualquier otra configuración útil
        
        Retorna SOLO el código JavaScript sin explicaciones.
      `;
      
      return await this.agent.generateCode(
        'app_additional',
        prompt,
        appData
      );
    } catch (error) {
      console.error('Error al generar código adicional para app:', error);
      return '// No se pudo generar código adicional';
    }
  }
  
  /**
   * Genera código adicional para consulta global
   * @returns {Promise<string>} Código adicional generado
   * @private
   */
  async _generateAdditionalGlobalQueryCode() {
    try {
      const prompt = `
        Genera código adicional para un servicio de consulta global.
        
        Incluye funcionalidades como:
        - Validación avanzada de parámetros
        - Autorización granular
        - Filtros complejos
        - Exportación de resultados
        - Estadísticas o agregaciones
        
        Retorna SOLO el código JavaScript sin explicaciones.
      `;
      
      return await this.agent.generateCode(
        'global_query_additional',
        prompt,
        { isAdmin: true }
      );
    } catch (error) {
      console.error('Error al generar código adicional para consulta global:', error);
      return '// No se pudo generar código adicional';
    }
  }
  
  /**
   * Genera código para un esquema GraphQL
   * @param {Object} schemaData - Datos para generar el esquema
   * @returns {Promise<string>} Código del esquema GraphQL generado
   */
  async generateGraphQLSchema(schemaData) {
    try {
      // Intentar cargar la plantilla de esquema GraphQL
      let template;
      
      try {
        template = await this.loadHbsTemplate('graphql', 'schema');
      } catch (error) {
        console.log('Plantilla de esquema GraphQL no encontrada, generando con IA');
        // Si no existe la plantilla, generar el código completo con IA
        return await this._generateGraphQLSchemaWithAI(schemaData);
      }
      
      // Generar código adicional específico para este esquema con IA
      const aiCode = await this._generateAdditionalGraphQLSchemaCode(schemaData);
      
      // Reemplazar marcador con código IA
      const processedTemplate = TemplateProcessor.processTemplate(template, schemaData);
      return processedTemplate.replace('# [IA_GENERATED_CODE]', aiCode);
    } catch (error) {
      console.error('Error al generar esquema GraphQL:', error);
      return '# Error al generar esquema GraphQL';
    }
  }
  
  /**
   * Genera código adicional para el esquema GraphQL
   * @param {Object} schemaData - Datos del esquema
   * @returns {Promise<string>} Código adicional para el esquema
   * @private
   */
  async _generateAdditionalGraphQLSchemaCode(schemaData) {
    const prompt = `
      Genera definiciones de tipos adicionales para un esquema GraphQL basado en estos modelos:
      ${JSON.stringify(schemaData.models)}
      
      Incluye:
      - Tipos de entrada (Input)
      - Tipos de retorno para consultas específicas
      - Enumeraciones relevantes
      - Interfaces que podrían ser útiles
      
      No incluyas los tipos básicos del modelo que ya están definidos.
      Retorna SOLO el código GraphQL para las definiciones adicionales.
    `;
    
    try {
      const code = await this.agent.generateCode(
        'graphql_schema_additional',
        prompt,
        schemaData
      );
      return code;
    } catch (error) {
      console.error('Error al generar código adicional para esquema GraphQL:', error);
      return '# No se pudo generar código adicional';
    }
  }
  
  /**
   * Genera código para resolvers de GraphQL
   * @param {Object} resolverData - Datos para generar los resolvers
   * @returns {Promise<string>} Código de resolvers GraphQL generado
   */
  async generateGraphQLResolvers(resolverData) {
    try {
      // Intentar cargar la plantilla de resolvers GraphQL
      let template;
      
      try {
        template = await this.loadHbsTemplate('graphql', 'resolvers');
      } catch (error) {
        console.log('Plantilla de resolvers GraphQL no encontrada, generando con IA');
        // Si no existe la plantilla, generar el código completo con IA
        return await this._generateGraphQLResolversWithAI(resolverData);
      }
      
      // Generar código adicional específico para estos resolvers con IA
      const aiCode = await this._generateAdditionalGraphQLResolverCode(resolverData);
      
      // Reemplazar marcador con código IA
      const processedTemplate = TemplateProcessor.processTemplate(template, resolverData);
      return processedTemplate.replace('// [IA_GENERATED_CODE]', aiCode);
    } catch (error) {
      console.error('Error al generar resolvers GraphQL:', error);
      return '// Error al generar resolvers GraphQL';
    }
  }
  
  /**
   * Genera código adicional para los resolvers GraphQL
   * @param {Object} resolverData - Datos de los resolvers
   * @returns {Promise<string>} Código adicional para los resolvers
   * @private
   */
  async _generateAdditionalGraphQLResolverCode(resolverData) {
    const prompt = `
      Genera implementaciones adicionales para los resolvers GraphQL basado en estos modelos:
      ${JSON.stringify(resolverData.models)}
      
      Incluye:
      - Resolvers para consultas complejas
      - Resolvers para campos computados
      - Resolvers para relaciones entre entidades
      - Lógica para mutaciones específicas
      
      No incluyas los resolvers básicos (query y mutation para operaciones CRUD) que ya están definidos.
      Retorna SOLO el código JavaScript para los resolvers adicionales.
    `;
    
    try {
      const code = await this.agent.generateCode(
        'graphql_resolvers_additional',
        prompt,
        resolverData
      );
      return code;
    } catch (error) {
      console.error('Error al generar código adicional para resolvers GraphQL:', error);
      return '// No se pudo generar código adicional';
    }
  }

  /**
   * Genera el archivo principal para configurar Apollo Server o similar
   * @param {Object} graphqlData - Datos para la configuración de GraphQL
   * @returns {Promise<string>} Código de configuración GraphQL generado
   */
  async generateGraphQLServer(graphqlData) {
    try {
      // Intentar cargar la plantilla de servidor GraphQL
      let template;
      
      try {
        template = await this.loadHbsTemplate('graphql', 'server');
      } catch (error) {
        console.log('Plantilla de servidor GraphQL no encontrada, generando con IA');
        // Si no existe la plantilla, generar el código completo con IA
        return await this._generateGraphQLServerWithAI(graphqlData);
      }
      
      // Generar código adicional específico para el servidor con IA
      const aiCode = await this._generateAdditionalGraphQLServerCode(graphqlData);
      
      // Reemplazar marcador con código IA
      const processedTemplate = TemplateProcessor.processTemplate(template, graphqlData);
      return processedTemplate.replace('// [IA_GENERATED_CODE]', aiCode);
    } catch (error) {
      console.error('Error al generar servidor GraphQL:', error);
      return '// Error al generar servidor GraphQL';
    }
  }
  
  /**
   * Genera código adicional para el servidor GraphQL
   * @param {Object} graphqlData - Datos del servidor
   * @returns {Promise<string>} Código adicional para el servidor
   * @private
   */
  async _generateAdditionalGraphQLServerCode(graphqlData) {
    const prompt = `
      Genera código adicional para la configuración de un servidor Apollo GraphQL.
      
      Incluye:
      - Configuración de middleware para autenticación
      - Plugins útiles para monitoreo o caching
      - Configuración de directivas personalizadas
      - Manejo avanzado de errores
      
      No incluyas la configuración básica que ya está definida.
      Retorna SOLO el código JavaScript adicional.
    `;
    
    try {
      const code = await this.agent.generateCode(
        'graphql_server_additional',
        prompt,
        graphqlData
      );
      return code;
    } catch (error) {
      console.error('Error al generar código adicional para servidor GraphQL:', error);
      return '// No se pudo generar código adicional';
    }
  }

  /**
   * Genera un esquema GraphQL completo usando IA
   * @param {Object} schemaData - Datos del esquema
   * @returns {Promise<string>} Esquema GraphQL completo generado
   * @private
   */
  async _generateGraphQLSchemaWithAI(schemaData) {
    const prompt = `
      Genera un esquema GraphQL completo para los siguientes modelos:
      ${JSON.stringify(schemaData.models)}
      
      El esquema debe incluir:
      - Tipos para cada modelo (Type)
      - Tipos de entrada para mutaciones (Input)
      - Enumeraciones relevantes
      - Interfaces si es necesario
      - Definición de Query con todas las consultas necesarias
      - Definición de Mutation con todas las operaciones necesarias
      
      Usa buenas prácticas de GraphQL y asegúrate de que la sintaxis sea válida.
      Retorna SOLO el código GraphQL sin explicaciones adicionales.
    `;
    
    try {
      return await this.agent.generateCode(
        'graphql_schema',
        prompt,
        schemaData
      );
    } catch (error) {
      console.error('Error al generar esquema GraphQL con IA:', error);
      throw error;
    }
  }

  /**
   * Genera resolvers GraphQL completos usando IA
   * @param {Object} resolverData - Datos de los resolvers
   * @returns {Promise<string>} Resolvers GraphQL completos generados
   * @private
   */
  async _generateGraphQLResolversWithAI(resolverData) {
    const prompt = `
      Genera resolvers completos para GraphQL basados en los siguientes modelos:
      ${JSON.stringify(resolverData.models)}
      
      Los resolvers deben incluir:
      - Implementación de todas las consultas (Query)
      - Implementación de todas las mutaciones (Mutation)
      - Resolvers para campos relacionados entre entidades
      - Resolvers para campos computados o complejos
      
      Usa MongoDB/Mongoose para las operaciones de base de datos.
      Incluye manejo de errores y validaciones básicas.
      Retorna SOLO el código JavaScript sin explicaciones adicionales.
    `;
    
    try {
      return await this.agent.generateCode(
        'graphql_resolvers',
        prompt,
        resolverData
      );
    } catch (error) {
      console.error('Error al generar resolvers GraphQL con IA:', error);
      throw error;
    }
  }

  /**
   * Genera configuración de servidor GraphQL completa usando IA
   * @param {Object} graphqlData - Datos de configuración
   * @returns {Promise<string>} Configuración del servidor GraphQL generada
   * @private
   */
  async _generateGraphQLServerWithAI(graphqlData) {
    const prompt = `
      Genera un archivo de configuración completo para un servidor Apollo GraphQL.
      
      La configuración debe incluir:
      - Importación de los esquemas y resolvers
      - Configuración de Apollo Server
      - Integración con Express
      - Middleware para autenticación
      - Manejo de errores
      - Playground/GraphiQL para desarrollo
      
      Usa las mejores prácticas actuales para Apollo Server.
      Retorna SOLO el código JavaScript sin explicaciones adicionales.
    `;
    
    try {
      return await this.agent.generateCode(
        'graphql_server',
        prompt,
        graphqlData
      );
    } catch (error) {
      console.error('Error al generar servidor GraphQL con IA:', error);
      throw error;
    }
  }
  
  /**
   * Genera código completo para implementar GraphQL en el proyecto
   * @param {Object} projectData - Datos del proyecto
   * @returns {Promise<Object>} Objeto con los diferentes archivos generados
   */
  async generateGraphQLAPI(projectData) {
    try {
      console.log('Generando API GraphQL...');
      
      // Preparar los datos necesarios para la generación
      const graphqlData = {
        projectName: projectData.name || 'api',
        models: projectData.models || [],
        config: projectData.config || {}
      };
      
      // Generar los diferentes archivos de GraphQL
      const schema = await this.generateGraphQLSchema(graphqlData);
      const resolvers = await this.generateGraphQLResolvers(graphqlData);
      const server = await this.generateGraphQLServer(graphqlData);
      
      // Generar archivos adicionales específicos de GraphQL si son necesarios
      const directives = await this._generateGraphQLDirectives(graphqlData);
      const scalars = await this._generateGraphQLScalars(graphqlData);
      
      // Devolver objeto con todos los archivos generados
      return {
        schema,
        resolvers,
        server,
        directives,
        scalars
      };
    } catch (error) {
      console.error('Error al generar API GraphQL:', error);
      throw error;
    }
  }
  
  /**
   * Genera código para directivas personalizadas de GraphQL
   * @param {Object} graphqlData - Datos de configuración
   * @returns {Promise<string>} Código para directivas personalizadas
   * @private
   */
  async _generateGraphQLDirectives(graphqlData) {
    const prompt = `
      Genera código para directivas personalizadas de GraphQL útiles para una API.
      
      Ejemplos de directivas que podrías implementar:
      - @auth - Verificar autenticación
      - @role - Verificar rol de usuario
      - @deprecated - Marcar campos obsoletos
      - @length - Validar longitud de strings
      - @date - Formatear fechas
      
      Incluye la definición en SDL y la implementación JavaScript.
      Retorna SOLO el código sin explicaciones adicionales.
    `;
    
    try {
      return await this.agent.generateCode(
        'graphql_directives',
        prompt,
        graphqlData
      );
    } catch (error) {
      console.error('Error al generar directivas GraphQL:', error);
      return '// No se pudieron generar directivas personalizadas';
    }
  }
  
  /**
   * Genera código para escalares personalizados de GraphQL
   * @param {Object} graphqlData - Datos de configuración
   * @returns {Promise<string>} Código para escalares personalizados
   * @private
   */
  async _generateGraphQLScalars(graphqlData) {
    const prompt = `
      Genera código para escalares personalizados de GraphQL útiles para una API.
      
      Ejemplos de escalares que podrías implementar:
      - DateTime - Para manejo de fechas y horas
      - Email - Para validar emails
      - URL - Para validar URLs
      - JSON - Para contenido JSON arbitrario
      - Upload - Para cargas de archivos
      
      Incluye la definición en SDL y la implementación JavaScript.
      Retorna SOLO el código sin explicaciones adicionales.
    `;
    
    try {
      return await this.agent.generateCode(
        'graphql_scalars',
        prompt,
        graphqlData
      );
    } catch (error) {
      console.error('Error al generar escalares GraphQL:', error);
      return '// No se pudieron generar escalares personalizados';
    }
  }

  /**
   * Genera código para un webhook a partir de datos de plantilla
   * @param {Object} webhookData - Datos para generar el webhook
   * @returns {Promise<string>} Código del webhook generado
   */
  async generateWebhook(webhookData) {
    try {
      // Intentar cargar la plantilla de webhook
      let template;
      
      try {
        template = await this.loadHbsTemplate('backend', 'webhook');
      } catch (error) {
        console.log('Plantilla de webhook no encontrada, generando con IA');
        // Si no existe la plantilla, generar el código completo con IA
        return await this._generateWebhookWithAI(webhookData);
      }
      
      // Procesar la plantilla
      return TemplateProcessor.processTemplate(template, webhookData);
    } catch (error) {
      console.error('Error al generar webhook:', error);
      return '// Error al generar webhook';
    }
  }
  
  /**
   * Genera un webhook completo usando IA
   * @param {Object} webhookData - Datos del webhook
   * @returns {Promise<string>} Código del webhook generado
   * @private
   */
  async _generateWebhookWithAI(webhookData) {
    const service = webhookData.service || 'generic';
    const prompt = `
      Genera un webhook completo para ${service}.
      
      El webhook debe:
      - Recibir peticiones desde ${service}
      - Verificar firmas o tokens de seguridad cuando sea aplicable
      - Procesar el payload recibido
      - Realizar acciones específicas según el tipo de evento
      - Responder adecuadamente
      
      Usa Express para manejar las rutas.
      Incluye validaciones y manejo de errores.
      Retorna SOLO el código JavaScript sin explicaciones adicionales.
    `;
    
    try {
      return await this.agent.generateCode(
        `webhook_${service.toLowerCase().replace(/\s+/g, '_')}`,
        prompt,
        webhookData
      );
    } catch (error) {
      console.error(`Error al generar webhook para ${service} con IA:`, error);
      throw error;
    }
  }

  /**
   * Genera código completo para un archivo usando IA
   * @param {string} filePath - Ruta del archivo a generar
   * @param {string} description - Descripción del archivo
   * @param {Object} context - Contexto del proyecto
   * @returns {Promise<string>} Código generado
   */
  async generateCompleteFile(filePath, description, context) {
    try {
      console.log(`   Generando código para ${filePath}...`);
      
      // Determinar tipo de archivo basado en extensión
      const fileExtension = path.extname(filePath).toLowerCase();
      let fileType = 'javascript';
      
      switch (fileExtension) {
        case '.js': fileType = 'javascript'; break;
        case '.ts': fileType = 'typescript'; break;
        case '.py': fileType = 'python'; break;
        case '.json': fileType = 'json'; break;
        case '.md': fileType = 'markdown'; break;
        case '.css': fileType = 'css'; break;
        case '.html': fileType = 'html'; break;
        case '.env': fileType = 'env'; break;
        case '.yml':
        case '.yaml': fileType = 'yaml'; break;
        default: fileType = 'javascript';
      }
      
      // Crear contexto enriquecido para el agente
      const enrichedContext = {
        ...context,
        file: {
          path: filePath,
          type: fileType,
          name: path.basename(filePath),
          description
        }
      };
      
      // Crear prompt específico según el tipo de archivo
      let prompt;
      
      if (fileType === 'env') {
        prompt = `
          Genera un archivo .env.example para un proyecto de backend con estas características:
          - Base de datos: ${context.database || 'MongoDB'}
          - Framework: ${context.framework || 'Express'}
          - Autenticación: ${context.auth || 'JWT'}
          
          Incluye todas las variables de entorno necesarias con valores de ejemplo.
          NO incluyas secretos reales ni credenciales.
          Añade comentarios explicativos para cada variable.
          
          Retorna SOLO el contenido del archivo sin explicaciones adicionales.
        `;
      } else if (filePath.endsWith('README.md')) {
        prompt = `
          Genera un README.md completo para un proyecto de backend con estas características:
          - Descripción: ${context.description || 'API REST'}
          - Base de datos: ${context.database || 'MongoDB'}
          - Framework: ${context.framework || 'Express'}
          
          El README debe incluir:
          - Título y descripción del proyecto
          - Requisitos previos
          - Instrucciones de instalación
          - Configuración del entorno
          - Uso de la API con ejemplos
          - Estructura del proyecto
          - Endpoints disponibles
          - Modelos principales
          
          Usa un formato atractivo con markdown.
          Retorna SOLO el contenido del archivo sin explicaciones adicionales.
        `;
      } else if (filePath.includes('package.json')) {
        prompt = `
          Genera un package.json completo para un proyecto de backend con estas características:
          - Nombre: ${context.projectName || path.basename(path.dirname(filePath))}
          - Base de datos: ${context.database || 'MongoDB'}
          - Framework: ${context.framework || 'Express'}
          
          Incluye todas las dependencias necesarias con versiones actualizadas y compatibles.
          Añade scripts útiles para desarrollo, pruebas y producción.
          
          Retorna SOLO el contenido del archivo JSON válido sin explicaciones adicionales.
        `;
      } else {
        prompt = `
          Genera el código completo para un archivo ${fileType} con la siguiente descripción:
          "${description}"
          
          Este archivo es parte de un proyecto con estas características:
          - Descripción del proyecto: ${context.description || 'API REST'}
          - Base de datos: ${context.database || 'MongoDB'}
          - Framework: ${context.framework || 'Express'}
          - Autenticación: ${context.auth || 'JWT'}
          
          La ruta del archivo es: ${filePath}
          
          Asegúrate de que el código sea completo, funcional y siga las mejores prácticas.
          Añade comentarios explicativos donde sea necesario.
          Importa las dependencias necesarias.
          
          Retorna SOLO el contenido del archivo, sin explicaciones adicionales.
        `;
      }
      
      // Generar código utilizando el agente de IA
      const generatedCode = await this.agent.generateCode(filePath, prompt, enrichedContext);
      
      // Formatear el código según el tipo de archivo (opcional)
      return generatedCode;
    } catch (error) {
      console.error(`Error al generar código para ${filePath}:`, error);
      throw error;
    }
  }
}

module.exports = TemplateProcessor;
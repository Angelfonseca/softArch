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
   * Genera código adicional para la funcionalidad de consulta global
   * @returns {Promise<string>} Código adicional para globalQuery
   * @private
   */
  async _generateAdditionalGlobalQueryCode() {
    const prompt = `
      Genera código adicional para mejorar la funcionalidad de consulta global.
      
      Estas funcionalidades podrían incluir:
      - Métodos para exportar datos (CSV, JSON, Excel)
      - Funciones de búsqueda avanzada
      - Métodos para realizar operaciones en lote
      - Estadísticas o agregaciones sobre los datos
      
      Retorna SOLO el código adicional, sin incluir las rutas básicas
      que ya están definidas.
    `;
    
    try {
      const code = await this.agent.generateCode(
        'globalQuery_additional', 
        prompt, 
        {}
      );
      return code;
    } catch (error) {
      console.error('Error al generar código adicional para globalQuery:', error);
      return '// No se pudo generar código adicional';
    }
  }
  
  /**
   * Genera código personalizado adicional para un controlador
   * @param {Object} controllerData - Datos del controlador
   * @returns {Promise<string>} Código adicional para el controlador
   * @private
   */
  async _generateAdditionalControllerCode(controllerData) {
    const prompt = `
      Genera métodos adicionales para el controlador "${controllerData.modelName}Controller".
      Estos métodos deben complementar las operaciones CRUD básicas.
      Por ejemplo, podrían incluir búsquedas avanzadas, filtrado, paginación,
      o cualquier operación específica para este tipo de entidad.
      
      No incluyas los métodos básicos (getAll, getById, create, update, delete) 
      que ya están definidos.
      
      Retorna SOLO el código de los nuevos métodos, sin incluir la declaración 
      del objeto controlador ni el module.exports.
    `;
    
    try {
      const code = await this.agent.generateCode(
        `${controllerData.modelName}Controller_additional`, 
        prompt, 
        controllerData
      );
      return code;
    } catch (error) {
      console.error('Error al generar código adicional para controlador:', error);
      return '// No se pudo generar código adicional';
    }
  }
  
  /**
   * Genera código personalizado adicional para rutas
   * @param {Object} routeData - Datos de la ruta
   * @returns {Promise<string>} Código adicional para las rutas
   * @private
   */
  async _generateAdditionalRouteCode(routeData) {
    const prompt = `
      Genera rutas adicionales para el recurso "${routeData.modelName}".
      Estas rutas deben complementar las operaciones CRUD básicas.
      Por ejemplo, podrían incluir rutas para búsquedas avanzadas, 
      filtrado, paginación, o cualquier operación específica.
      
      No incluyas las rutas básicas (GET /, GET /:id, POST /, PUT /:id, DELETE /:id) 
      que ya están definidas.
      
      Usa el controlador "${routeData.modelName}Controller" con métodos adicionales
      que hayas definido.
      
      Retorna SOLO el código de las nuevas rutas, sin incluir la definición
      del router ni el module.exports.
    `;
    
    try {
      const code = await this.agent.generateCode(
        `${routeData.modelName}Routes_additional`, 
        prompt, 
        routeData
      );
      return code;
    } catch (error) {
      console.error('Error al generar código adicional para rutas:', error);
      return '// No se pudo generar código adicional';
    }
  }
  
  /**
   * Genera código personalizado adicional para la aplicación principal
   * @param {Object} appData - Datos de la aplicación
   * @returns {Promise<string>} Código adicional para la aplicación
   * @private
   */
  async _generateAdditionalAppCode(appData) {
    const prompt = `
      Genera código adicional para la aplicación Express.
      Este código puede incluir configuraciones adicionales, middleware 
      personalizado, o cualquier otra funcionalidad que consideres útil.
      
      Ejemplos de código que podrías generar:
      - Configuración de seguridad (helmet, rate limiting)
      - Manejo avanzado de errores
      - Logging
      - Documentación automática (Swagger/OpenAPI)
      - Compresión de respuestas
      
      No incluyas la configuración básica que ya está definida.
      
      Retorna SOLO el código adicional, sin incluir las partes que ya existen.
    `;
    
    try {
      const code = await this.agent.generateCode(
        'app_additional', 
        prompt, 
        appData
      );
      return code;
    } catch (error) {
      console.error('Error al generar código adicional para la aplicación:', error);
      return '// No se pudo generar código adicional';
    }
  }
  
  /**
   * Genera un archivo completo usando el agente de IA
   * @param {string} filePath - Ruta del archivo en el proyecto
   * @param {string} description - Descripción del archivo
   * @param {Object} context - Contexto del proyecto
   * @returns {Promise<string>} Código generado
   */
  async generateCompleteFile(filePath, description, context) {
    try {
      return await this.agent.generateCode(filePath, description, context);
    } catch (error) {
      console.error(`Error al generar archivo completo para ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Genera código para un webhook específico
   * @param {Object} webhookData - Datos del webhook a generar
   * @returns {Promise<string>} - Código generado para el webhook
   */
  async generateWebhook(webhookData) {
    try {
      // Cargar la plantilla de webhook
      const template = await this.loadHbsTemplate('backend', 'webhook');
      
      // Generar código adicional específico para el webhook
      const aiCode = await this._generateWebhookImplementation(webhookData);
      
      // Procesar la plantilla
      const processedTemplate = TemplateProcessor.processTemplate(template, webhookData);
      
      // Reemplazar marcador con código IA
      return processedTemplate.replace('// [IA_GENERATED_CODE]', aiCode);
    } catch (error) {
      console.error(`Error al generar webhook para ${webhookData.serviceName}:`, error);
      
      // Si hay error al cargar la plantilla, generar el código completamente con IA
      try {
        return await this.agent.generateCode(
          `routes/webhooks/${webhookData.serviceName.toLowerCase()}Webhook.js`,
          `Implementa un webhook para ${webhookData.serviceName} que maneje los siguientes eventos: ${webhookData.eventTypes.map(e => e.name).join(', ')}. Incluye verificación de seguridad y manejo de errores.`,
          webhookData
        );
      } catch (aiError) {
        console.error(`Error al generar webhook con IA para ${webhookData.serviceName}:`, aiError);
        throw error;
      }
    }
  }
  
  /**
   * Genera la implementación específica para un servicio de webhook
   * @param {Object} webhookData - Datos del webhook
   * @returns {Promise<string>} - Código generado
   * @private
   */
  async _generateWebhookImplementation(webhookData) {
    const prompt = `
      Genera código para implementar las funciones de manejo de eventos para un webhook de ${webhookData.serviceName}.
      
      Los tipos de eventos que debe manejar son:
      ${webhookData.eventTypes.map(e => `- ${e.name}: ${e.description}`).join('\n')}
      
      El código debe incluir:
      - Implementación detallada de cada función de manejo de eventos
      - Procesamiento apropiado de los datos del payload
      - Actualización de bases de datos o notificaciones según sea necesario
      - Manejo de errores
      
      Retorna SOLO el código de implementación, sin incluir la definición del router ni el module.exports.
    `;
    
    try {
      const code = await this.agent.generateCode(
        `${webhookData.serviceName.toLowerCase()}_webhook_implementation`,
        prompt,
        webhookData
      );
      return code;
    } catch (error) {
      console.error(`Error al generar implementación para webhook de ${webhookData.serviceName}:`, error);
      return '// No se pudo generar código de implementación';
    }
  }
  
  /**
   * Genera configuración de webhook basada en el nombre del servicio
   * @param {string} serviceName - Nombre del servicio (WhatsApp, Twitch, etc.)
   * @returns {Promise<Object>} - Configuración del webhook
   */
  async generateWebhookConfig(serviceName) {
    const normalizedService = serviceName.toLowerCase();
    
    // Configuraciones predefinidas para servicios comunes
    const commonConfigs = {
      whatsapp: {
        serviceName: 'WhatsApp',
        description: 'Maneja eventos de mensajería de WhatsApp Business API',
        verificationToken: true,
        signatureMethod: 'hmac',
        signatureHeader: 'x-hub-signature-256',
        hashAlgorithm: 'sha256',
        digestFormat: 'hex',
        signaturePrefix: 'sha256=',
        eventTypeField: 'entry[0].changes[0].field',
        eventTypes: [
          { name: 'Message', type: 'messages', description: 'Mensaje recibido de un usuario' },
          { name: 'StatusUpdate', type: 'message_status_update', description: 'Actualización de estado de mensaje' },
          { name: 'OptIn', type: 'opt_in', description: 'Usuario ha optado por recibir mensajes' }
        ]
      },
      twitch: {
        serviceName: 'Twitch',
        description: 'Maneja eventos de la API de webhooks de Twitch',
        verificationToken: true,
        signatureMethod: 'hmac',
        signatureHeader: 'twitch-eventsub-message-signature',
        hashAlgorithm: 'sha256',
        digestFormat: 'hex',
        signaturePrefix: 'sha256=',
        eventTypeField: 'subscription.type',
        challenge: true,
        challengeParam: 'hub.challenge',
        eventTypes: [
          { name: 'StreamOnline', type: 'stream.online', description: 'Stream comenzó' },
          { name: 'StreamOffline', type: 'stream.offline', description: 'Stream terminó' },
          { name: 'ChannelFollow', type: 'channel.follow', description: 'Usuario siguió el canal' },
          { name: 'ChannelSubscription', type: 'channel.subscribe', description: 'Usuario se suscribió al canal' }
        ]
      },
      github: {
        serviceName: 'GitHub',
        description: 'Maneja eventos de GitHub webhooks',
        verificationToken: true,
        signatureMethod: 'hmac',
        signatureHeader: 'x-hub-signature-256',
        hashAlgorithm: 'sha256',
        digestFormat: 'hex',
        signaturePrefix: 'sha256=',
        eventTypeField: 'headers[\'x-github-event\']',
        eventTypes: [
          { name: 'Push', type: 'push', description: 'Código enviado al repositorio' },
          { name: 'PullRequest', type: 'pull_request', description: 'Pull request creado o actualizado' },
          { name: 'Issue', type: 'issues', description: 'Issue creado o actualizado' }
        ]
      },
      stripe: {
        serviceName: 'Stripe',
        description: 'Maneja eventos de pagos de Stripe',
        verificationToken: true,
        signatureMethod: 'hmac',
        signatureHeader: 'stripe-signature',
        hashAlgorithm: 'sha256',
        digestFormat: 'hex',
        eventTypeField: 'type',
        eventTypes: [
          { name: 'PaymentIntent', type: 'payment_intent.succeeded', description: 'Pago completado exitosamente' },
          { name: 'PaymentFailed', type: 'payment_intent.payment_failed', description: 'Pago fallido' },
          { name: 'CustomerSubscription', type: 'customer.subscription.created', description: 'Suscripción creada' }
        ]
      },
      slack: {
        serviceName: 'Slack',
        description: 'Maneja eventos de la API de Slack',
        verificationToken: true,
        signatureMethod: 'hmac',
        signatureHeader: 'x-slack-signature',
        hashAlgorithm: 'sha256',
        digestFormat: 'hex',
        signaturePrefix: 'v0=',
        eventTypeField: 'event.type',
        challenge: true,
        challengeParam: 'challenge',
        eventTypes: [
          { name: 'Message', type: 'message', description: 'Mensaje publicado en un canal' },
          { name: 'AppMention', type: 'app_mention', description: 'La app fue mencionada en un mensaje' },
          { name: 'ReactionAdded', type: 'reaction_added', description: 'Reacción añadida a un mensaje' }
        ]
      }
    };
    
    // Buscar configuración predefinida
    for (const [service, config] of Object.entries(commonConfigs)) {
      if (normalizedService.includes(service)) {
        return config;
      }
    }
    
    // Si no se encuentra una configuración predefinida, generar con IA
    return this._generateCustomWebhookConfig(serviceName);
  }
  
  /**
   * Genera una configuración personalizada para un servicio de webhook no predefinido
   * @param {string} serviceName - Nombre del servicio
   * @returns {Promise<Object>} - Configuración del webhook
   * @private
   */
  async _generateCustomWebhookConfig(serviceName) {
    const prompt = `
      Genera una configuración de webhook para el servicio "${serviceName}".
      
      La configuración debe incluir:
      - Nombre del servicio
      - Descripción breve
      - Si requiere token de verificación
      - Método de verificación de firma (hmac, token, etc.)
      - Campos necesarios para verificación
      - Campo para identificar el tipo de evento
      - Lista de tipos de eventos comunes para este servicio
      
      Retorna SOLO un objeto JSON con la configuración, sin explicaciones adicionales.
    `;
    
    try {
      const configJson = await this.agent.generateCode(
        `${serviceName.toLowerCase()}_webhook_config`,
        prompt,
        { serviceName }
      );
      
      // Extraer el objeto JSON de la respuesta
      const jsonMatch = configJson.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Si no se puede extraer JSON, usar una configuración genérica
      return {
        serviceName,
        description: `Maneja eventos de ${serviceName}`,
        verificationToken: false,
        eventTypeField: 'type',
        eventTypes: [
          { name: 'Generic', type: 'event', description: 'Evento genérico' }
        ]
      };
    } catch (error) {
      console.error(`Error al generar configuración para webhook de ${serviceName}:`, error);
      
      // Configuración genérica en caso de error
      return {
        serviceName,
        description: `Maneja eventos de ${serviceName}`,
        verificationToken: false,
        eventTypeField: 'type',
        eventTypes: [
          { name: 'Generic', type: 'event', description: 'Evento genérico' }
        ]
      };
    }
  }
}

module.exports = TemplateProcessor;
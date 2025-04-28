/**
 * Servicio para gestionar diagramas de proyectos en MongoDB
 */
const mongoose = require('mongoose');
const ProjectDiagram = require('../models/projectDiagram');
const deepseekConfig = require('../config/deepseek');

class DiagramService {
  constructor() {
    this.connected = false;
    this.uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/softarch';
  }

  /**
   * Conecta con la base de datos MongoDB
   */
  async connect() {
    if (this.connected) return;
    
    try {
      await mongoose.connect(this.uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false,
        useCreateIndex: true
      });
      
      console.log('Conexión a MongoDB establecida');
      this.connected = true;
    } catch (error) {
      console.error('Error al conectar con MongoDB:', error);
      throw error;
    }
  }

  /**
   * Guarda un diagrama de proyecto en la base de datos
   * @param {Object} projectData - Datos del proyecto 
   * @returns {Promise<Object>} - Diagrama guardado
   */
  async saveDiagram(projectData) {
    await this.connect();
    
    try {
      // Verificar si ya existe un diagrama con el mismo nombre
      const existingDiagram = await ProjectDiagram.findByName(projectData.name);
      
      if (existingDiagram) {
        // Actualizar el existente
        existingDiagram.description = projectData.description;
        existingDiagram.architecture = projectData.architecture;
        existingDiagram.diagram = projectData.diagram;
        existingDiagram.outputPath = projectData.outputPath;
        existingDiagram.options = projectData.options;
        
        await existingDiagram.save();
        return existingDiagram;
      } else {
        // Crear uno nuevo
        const newDiagram = new ProjectDiagram(projectData);
        await newDiagram.save();
        return newDiagram;
      }
    } catch (error) {
      console.error('Error al guardar diagrama:', error);
      throw error;
    }
  }

  /**
   * Busca un diagrama por su nombre
   * @param {string} name - Nombre del proyecto
   * @returns {Promise<Object>} - Diagrama encontrado
   */
  async findDiagramByName(name) {
    await this.connect();
    
    try {
      return await ProjectDiagram.findByName(name);
    } catch (error) {
      console.error('Error al buscar diagrama:', error);
      throw error;
    }
  }

  /**
   * Obtiene los diagramas más recientes
   * @param {number} limit - Número máximo de diagramas a obtener
   * @returns {Promise<Array>} - Lista de diagramas
   */
  async getRecentDiagrams(limit = 10) {
    await this.connect();
    
    try {
      return await ProjectDiagram.findRecent(limit);
    } catch (error) {
      console.error('Error al obtener diagramas recientes:', error);
      throw error;
    }
  }

  /**
   * Elimina un diagrama
   * @param {string} id - ID del diagrama a eliminar
   * @returns {Promise<boolean>} - true si se eliminó correctamente
   */
  async deleteDiagram(id) {
    await this.connect();
    
    try {
      const result = await ProjectDiagram.findByIdAndDelete(id);
      return !!result;
    } catch (error) {
      console.error('Error al eliminar diagrama:', error);
      throw error;
    }
  }

  /**
   * Genera un diagrama visual del proyecto
   * @param {Object} architecture - Arquitectura del proyecto
   * @returns {Object} - Datos del diagrama
   */
  async generateDiagram(architecture) {
    // Estructura base del diagrama
    const diagram = {
      nodes: [],
      edges: [],
      groups: []
    };
    
    // Añadir carpetas como grupos
    if (architecture.folders && architecture.folders.length) {
      architecture.folders.forEach((folder, index) => {
        const groupId = `group-${index}`;
        diagram.groups.push({
          id: groupId,
          label: folder.path,
          description: folder.description
        });
        
        // Encontrar archivos que pertenecen a esta carpeta
        if (architecture.files && architecture.files.length) {
          architecture.files
            .filter(file => file.path.startsWith(folder.path + '/'))
            .forEach(file => {
              const fileId = `file-${diagram.nodes.length}`;
              diagram.nodes.push({
                id: fileId,
                label: file.path.split('/').pop(),
                description: file.description,
                type: this._getFileType(file.path),
                parent: groupId
              });
            });
        }
      });
    }
    
    // Añadir archivos que no están en carpetas
    if (architecture.files && architecture.files.length) {
      architecture.files
        .filter(file => !diagram.nodes.some(node => node.label === file.path.split('/').pop()))
        .forEach(file => {
          diagram.nodes.push({
            id: `file-${diagram.nodes.length}`,
            label: file.path.split('/').pop(),
            description: file.description,
            type: this._getFileType(file.path)
          });
        });
    }
    
    // Generar conexiones basadas en dependencias
    this._generateConnections(diagram, architecture);
    
    return diagram;
  }
  
  /**
   * Determina el tipo de archivo basado en su extensión o ruta
   * @param {string} filePath - Ruta del archivo
   * @returns {string} - Tipo de archivo
   * @private
   */
  _getFileType(filePath) {
    const ext = filePath.split('.').pop().toLowerCase();
    
    if (filePath.includes('/models/')) return 'model';
    if (filePath.includes('/controllers/')) return 'controller';
    if (filePath.includes('/routes/')) return 'route';
    if (filePath.includes('/config/')) return 'config';
    if (filePath.includes('/middleware/')) return 'middleware';
    
    switch (ext) {
      case 'js':
        return 'javascript';
      case 'json':
        return 'json';
      case 'md':
        return 'markdown';
      default:
        return ext;
    }
  }
  
  /**
   * Genera conexiones entre archivos basadas en sus dependencias
   * @param {Object} diagram - Datos del diagrama
   * @param {Object} architecture - Arquitectura del proyecto
   * @private
   */
  _generateConnections(diagram, architecture) {
    // Conexiones típicas en una aplicación Node.js/Express
    
    // Modelos -> Controladores
    const models = diagram.nodes.filter(node => node.type === 'model');
    const controllers = diagram.nodes.filter(node => node.type === 'controller');
    
    models.forEach(model => {
      controllers.forEach(controller => {
        if (controller.label.toLowerCase().includes(model.label.toLowerCase().replace('.js', ''))) {
          diagram.edges.push({
            id: `edge-${diagram.edges.length}`,
            source: model.id,
            target: controller.id,
            label: 'usa'
          });
        }
      });
    });
    
    // Controladores -> Rutas
    const routes = diagram.nodes.filter(node => node.type === 'route');
    
    controllers.forEach(controller => {
      routes.forEach(route => {
        if (route.label.toLowerCase().includes(controller.label.toLowerCase().replace('controller.js', ''))) {
          diagram.edges.push({
            id: `edge-${diagram.edges.length}`,
            source: controller.id,
            target: route.id,
            label: 'es usado por'
          });
        }
      });
    });
    
    // Middleware -> Rutas
    const middlewares = diagram.nodes.filter(node => node.type === 'middleware');
    
    middlewares.forEach(middleware => {
      routes.forEach(route => {
        diagram.edges.push({
          id: `edge-${diagram.edges.length}`,
          source: middleware.id,
          target: route.id,
          label: 'protege'
        });
      });
    });
  }
}

module.exports = DiagramService;
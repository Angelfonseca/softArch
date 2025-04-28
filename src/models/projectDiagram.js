/**
 * Modelo para almacenamiento de diagramas de proyectos
 */
const mongoose = require('mongoose');

const ProjectDiagramSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    index: true
  },
  description: {
    type: String,
    required: true
  },
  architecture: {
    type: Object,
    required: true
  },
  diagram: {
    type: Object,
    required: true
  },
  outputPath: {
    type: String
  },
  options: {
    type: Object,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Actualizar la fecha cuando se modifique
ProjectDiagramSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Métodos para buscar diagramas
ProjectDiagramSchema.statics.findByName = function(name) {
  return this.findOne({ name: new RegExp(name, 'i') });
};

ProjectDiagramSchema.statics.findRecent = function(limit = 10) {
  return this.find().sort({ createdAt: -1 }).limit(limit);
};

const ProjectDiagram = mongoose.model('ProjectDiagram', ProjectDiagramSchema);

module.exports = ProjectDiagram;
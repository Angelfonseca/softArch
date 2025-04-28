/**
 * Interfaz de línea de comandos para la generación de arquitecturas API
 */
const { Command } = require('commander');
const path = require('path');
const ProjectGenerator = require('../models/projectGenerator');
const fs = require('fs-extra');

// Inicializar el generador de proyectos
const generator = new ProjectGenerator();

// Crear la aplicación CLI
const program = new Command();

program
  .name('softarch')
  .description('Generador de arquitecturas de software basado en IA')
  .version('1.0.0');

// Comando para generar estructura de proyecto
program
  .command('generate')
  .description('Genera una estructura de proyecto basada en una descripción')
  .argument('<description>', 'Descripción del proyecto')
  .option('-o, --output <path>', 'Ruta de salida', './output')
  .action(async (description, options) => {
    try {
      const outputPath = path.resolve(options.output);
      console.log(`Generando arquitectura para: "${description}"`);
      console.log(`Ruta de salida: ${outputPath}`);
      
      const architecture = await generator.generateStructure(description, outputPath);
      console.log('Arquitectura generada con éxito!');
    } catch (error) {
      console.error('Error al generar la arquitectura:', error);
      process.exit(1);
    }
  });

// Comando para generar un backend
program
  .command('backend')
  .description('Genera un backend completo basado en una descripción')
  .argument('<description>', 'Descripción del backend')
  .option('-o, --output <path>', 'Ruta de salida', './output')
  .option('-d, --database <db>', 'Base de datos a utilizar', 'MongoDB')
  .option('-f, --framework <framework>', 'Framework a utilizar', 'Express')
  .option('-a, --auth <auth>', 'Método de autenticación', 'JWT')
  .option('--global-query', 'Incluir consulta global para administradores', false)
  .action(async (description, options) => {
    try {
      const outputPath = path.resolve(options.output);
      console.log(`Generando backend para: "${description}"`);
      console.log(`Ruta de salida: ${outputPath}`);
      console.log(`Base de datos: ${options.database}`);
      console.log(`Framework: ${options.framework}`);
      console.log(`Autenticación: ${options.auth}`);
      
      const result = await generator.generateBackend(description, outputPath, {
        database: options.database,
        framework: options.framework,
        auth: options.auth,
        includeGlobalQuery: options.globalQuery
      });
      
      console.log('Backend generado con éxito!');
    } catch (error) {
      console.error('Error al generar el backend:', error);
      process.exit(1);
    }
  });

// Comando para generar un proyecto completo con MongoDB
program
  .command('create')
  .description('Genera un proyecto completo con diagrama guardado en MongoDB')
  .argument('<description>', 'Descripción del proyecto')
  .option('-o, --output <path>', 'Ruta de salida', './output')
  .option('-n, --name <n>', 'Nombre del proyecto', 'proyecto-api')
  .option('-d, --database <db>', 'Base de datos a utilizar', 'MongoDB')
  .option('-f, --framework <framework>', 'Framework a utilizar', 'Express')
  .option('-a, --auth <auth>', 'Método de autenticación', 'JWT')
  .option('--global-query', 'Incluir consulta global para administradores', false)
  .option('--use-templates', 'Usar plantillas CRUD predefinidas', true)
  .option('--zip', 'Generar archivo ZIP del proyecto', true)
  .option('--edit', 'Permitir edición manual antes de finalizar', false)
  .action(async (description, options) => {
    try {
      // Asegurar que se usa el nombre del proyecto dentro de la carpeta output
      const baseOutputPath = path.resolve(options.output);
      const projectName = options.name;
      const outputPath = path.join(baseOutputPath, projectName);
      
      console.log(`Generando proyecto completo: "${projectName}"`);
      console.log(`Descripción: ${description}`);
      console.log(`Ruta de salida: ${outputPath}`);
      console.log(`Usando plantillas CRUD: ${options.useTemplates ? 'Sí' : 'No'}`);
      console.log(`Generar ZIP: ${options.zip ? 'Sí' : 'No'}`);
      console.log(`Permitir edición previa: ${options.edit ? 'Sí' : 'No'}`);
      
      // Asegurar que la carpeta output existe
      await fs.ensureDir(baseOutputPath);
      
      const result = await generator.generateCompleteProject(description, outputPath, {
        name: projectName,
        database: options.database,
        framework: options.framework,
        auth: options.auth,
        includeGlobalQuery: options.globalQuery,
        useTemplates: options.useTemplates,
        generateZip: options.zip,
        allowPreviewEdit: options.edit
      });
      
      console.log(`\n🎉 Proyecto completo generado con éxito!`);
      console.log(`📁 Ubicación: ${outputPath}`);
      
      if (result.zipPath) {
        console.log(`🗜️ Archivo ZIP: ${result.zipPath}`);
        console.log('  Puedes descargar este archivo para compartir el proyecto completo.');
      }
      
      console.log(`🗄️ Diagrama guardado en MongoDB con ID: ${result.diagramId}`);
    } catch (error) {
      console.error('Error al generar el proyecto completo:', error);
      process.exit(1);
    }
  });

// Comando para regenerar un proyecto desde MongoDB
program
  .command('regenerate')
  .description('Regenera un proyecto desde un diagrama guardado en MongoDB')
  .argument('<name>', 'Nombre del proyecto')
  .option('-o, --output <path>', 'Ruta de salida (opcional)')
  .action(async (name, options) => {
    try {
      const outputPath = options.output ? path.resolve(options.output) : null;
      
      console.log(`Regenerando proyecto: "${name}"`);
      if (outputPath) {
        console.log(`Ruta de salida: ${outputPath}`);
      }
      
      const result = await generator.regenerateProjectFromDiagram(name, outputPath);
      
      console.log(`Proyecto regenerado con éxito!`);
      console.log(`Ruta: ${result.outputPath}`);
    } catch (error) {
      console.error('Error al regenerar el proyecto:', error);
      process.exit(1);
    }
  });

// Comando para listar proyectos recientes
program
  .command('list')
  .description('Lista proyectos recientes guardados en MongoDB')
  .option('-l, --limit <number>', 'Número máximo de proyectos a mostrar', 10)
  .action(async (options) => {
    try {
      const limit = parseInt(options.limit);
      
      console.log(`Obteniendo proyectos recientes (máximo ${limit})...`);
      
      const projects = await generator.getRecentProjects(limit);
      
      console.log(`\n=== Proyectos recientes (${projects.length}) ===`);
      projects.forEach((project, index) => {
        console.log(`\n${index + 1}. ${project.name}`);
        console.log(`   Descripción: ${project.description.substring(0, 60)}${project.description.length > 60 ? '...' : ''}`);
        console.log(`   Fecha: ${new Date(project.createdAt).toLocaleString()}`);
        console.log(`   ID: ${project._id}`);
      });
      
      console.log('\nPara regenerar un proyecto: softarch regenerate <nombre>');
    } catch (error) {
      console.error('Error al listar proyectos:', error);
      process.exit(1);
    }
  });

// Comando para procesar una solicitud en lenguaje natural
program
  .command('process')
  .description('Procesa una solicitud en lenguaje natural')
  .argument('<request>', 'Solicitud en lenguaje natural')
  .option('-o, --output <path>', 'Ruta de salida', './output')
  .action(async (request, options) => {
    try {
      const outputPath = path.resolve(options.output);
      console.log(`Procesando solicitud: "${request}"`);
      console.log(`Ruta de salida: ${outputPath}`);
      
      const result = await generator.processNaturalLanguageRequest(request, outputPath);
      
      console.log('Solicitud procesada con éxito!');
    } catch (error) {
      console.error('Error al procesar solicitud:', error);
      process.exit(1);
    }
  });

// Comando para generar un webhook
program
  .command('webhook')
  .description('Genera un webhook para un servicio específico')
  .argument('<service>', 'Servicio para el webhook (WhatsApp, Twitch, GitHub, etc.)')
  .option('-o, --output <path>', 'Ruta de salida', './output')
  .action(async (service, options) => {
    try {
      const outputPath = path.resolve(options.output);
      console.log(`Generando webhook para: ${service}`);
      console.log(`Ruta de salida: ${outputPath}`);
      
      const result = await generator.generateWebhook(service, outputPath);
      
      console.log('Webhook generado con éxito!');
      console.log(`Archivo creado: ${result.webhookPath}`);
    } catch (error) {
      console.error('Error al generar webhook:', error);
      process.exit(1);
    }
  });

// Exportar el programa para su uso en otros módulos
module.exports = program;
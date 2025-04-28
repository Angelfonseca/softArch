/**
 * Interfaz de línea de comandos para la generación de arquitecturas API
 */
const { Command } = require('commander');
const path = require('path');
const ProjectGenerator = require('../models/projectGenerator');
const fs = require('fs-extra');
const readline = require('readline');

// Inicializar el generador de proyectos
const generator = new ProjectGenerator();

// Crear interfaz para entrada/salida
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Función para preguntar al usuario
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Crear la aplicación CLI
const program = new Command();

program
  .name('softarch')
  .description('Generador de arquitecturas de software basado en IA')
  .version('1.0.0');

// Comando para generar vista previa de la arquitectura
program
  .command('preview')
  .description('Genera una vista previa de la arquitectura y permite interactuar con el agente de IA')
  .argument('<description>', 'Descripción del proyecto')
  .option('-n, --name <n>', 'Nombre del proyecto', 'proyecto-api')
  .option('-d, --database <db>', 'Base de datos a utilizar (dejar vacío para obtener recomendación)')
  .option('-f, --framework <framework>', 'Framework a utilizar (dejar vacío para obtener recomendación)')
  .option('-a, --auth <auth>', 'Método de autenticación (dejar vacío para obtener recomendación)')
  .option('--graphql', 'Incluir GraphQL')
  .option('--no-graphql', 'No incluir GraphQL')
  .option('-o, --output <path>', 'Ruta de salida para la generación final', './output')
  .option('--save', 'Guardar la configuración para uso futuro')
  .option('--generate', 'Generar el proyecto después de la vista previa')
  .action(async (description, options) => {
    try {
      // Preparar opciones iniciales
      const initialOptions = {
        name: options.name,
        database: options.database,
        framework: options.framework,
        auth: options.auth,
        includeGraphQL: options.graphql
      };
      
      // Solo incluir opciones que fueron especificadas por el usuario
      const userOptions = {};
      if (options.database) userOptions.database = options.database;
      if (options.framework) userOptions.framework = options.framework;
      if (options.auth) userOptions.auth = options.auth;
      if (options.graphql !== undefined) userOptions.includeGraphQL = options.graphql;

      console.log('\n🧠 Generando vista previa para el proyecto...');
      console.log(`📝 Descripción: "${description}"`);
      
      // Generar vista previa y obtener recomendaciones
      const { options: enrichedOptions, recommendation, architecture } = await generator.generatePreview(description, userOptions);
      
      // Mostrar recomendaciones detalladas
      console.log('\n🔮 Recomendaciones detalladas del agente de IA:');
      if (recommendation.recommendations && recommendation.recommendations.length > 0) {
        console.log('\n- Recomendaciones técnicas:');
        recommendation.recommendations.forEach((rec, index) => {
          console.log(`  ${index + 1}. ${rec}`);
        });
      }
      
      if (recommendation.suggestions && recommendation.suggestions.length > 0) {
        console.log('\n- Paquetes y dependencias recomendadas:');
        recommendation.suggestions.forEach((pkg, index) => {
          console.log(`  ${index + 1}. ${pkg}`);
        });
      }
      
      console.log('\n📋 Configuración recomendada:');
      console.log(`  - Base de datos: ${enrichedOptions.database}`);
      console.log(`  - Framework: ${enrichedOptions.framework}`);
      console.log(`  - Autenticación: ${enrichedOptions.auth}`);
      console.log(`  - GraphQL: ${enrichedOptions.includeGraphQL ? 'Sí' : 'No'}`);
      console.log(`  - WebSockets: ${enrichedOptions.includeWebsockets ? 'Sí' : 'No'}`);
      console.log(`  - Consulta global: ${enrichedOptions.includeGlobalQuery ? 'Sí' : 'No'}`);
      
      // Interactuar con el usuario para confirmar o ajustar configuraciones
      console.log('\n✏️ Puedes ajustar la configuración antes de generar el proyecto:');
      
      const dbAnswer = await question(`Base de datos [${enrichedOptions.database}]: `);
      const finalDB = dbAnswer || enrichedOptions.database;
      
      const frameworkAnswer = await question(`Framework [${enrichedOptions.framework}]: `);
      const finalFramework = frameworkAnswer || enrichedOptions.framework;
      
      const authAnswer = await question(`Autenticación [${enrichedOptions.auth}]: `);
      const finalAuth = authAnswer || enrichedOptions.auth;
      
      const graphqlAnswer = await question(`Incluir GraphQL (s/n) [${enrichedOptions.includeGraphQL ? 's' : 'n'}]: `);
      const finalGraphQL = graphqlAnswer ? (graphqlAnswer.toLowerCase() === 's') : enrichedOptions.includeGraphQL;
      
      const websocketsAnswer = await question(`Incluir WebSockets (s/n) [${enrichedOptions.includeWebsockets ? 's' : 'n'}]: `);
      const finalWebsockets = websocketsAnswer ? (websocketsAnswer.toLowerCase() === 's') : enrichedOptions.includeWebsockets;
      
      const globalQueryAnswer = await question(`Incluir consulta global (s/n) [${enrichedOptions.includeGlobalQuery ? 's' : 'n'}]: `);
      const finalGlobalQuery = globalQueryAnswer ? (globalQueryAnswer.toLowerCase() === 's') : enrichedOptions.includeGlobalQuery;
      
      // Mostrar configuración final
      console.log('\n📋 Configuración final:');
      console.log(`  - Base de datos: ${finalDB}`);
      console.log(`  - Framework: ${finalFramework}`);
      console.log(`  - Autenticación: ${finalAuth}`);
      console.log(`  - GraphQL: ${finalGraphQL ? 'Sí' : 'No'}`);
      console.log(`  - WebSockets: ${finalWebsockets ? 'Sí' : 'No'}`);
      console.log(`  - Consulta global: ${finalGlobalQuery ? 'Sí' : 'No'}`);
      
      // Preparar las opciones finales para la generación
      const finalOptions = {
        name: options.name,
        database: finalDB,
        framework: finalFramework,
        auth: finalAuth,
        includeGraphQL: finalGraphQL,
        includeWebsockets: finalWebsockets,
        includeGlobalQuery: finalGlobalQuery,
        useTemplates: true,
        generateZip: true,
        continueOnError: true
      };
      
      // Preguntar si quiere guardar la configuración
      if (options.save) {
        const saveResult = await generator.saveProjectConfiguration(
          options.name,
          description,
          finalOptions,
          architecture
        );
        
        if (saveResult.success) {
          console.log(`\n✅ Configuración guardada correctamente como "${options.name}"`);
          console.log(`   Para generar este proyecto más tarde: softarch generate-saved ${options.name}`);
        } else {
          console.log(`\n⚠️ No se pudo guardar la configuración: ${saveResult.message}`);
        }
      }
      
      // Preguntar si quiere generar el proyecto con esta configuración
      let generateProject = options.generate;
      
      if (!generateProject) {
        const generateAnswer = await question('\n¿Deseas generar el proyecto con esta configuración? (s/n) [s]: ');
        generateProject = !generateAnswer || generateAnswer.toLowerCase() === 's';
      }
      
      if (!generateProject) {
        console.log('\n❌ Generación cancelada por el usuario.');
        rl.close();
        return;
      }
      
      // Generar el proyecto
      console.log('\n🚀 Generando proyecto con la configuración personalizada...');
      const baseOutputPath = path.resolve(options.output);
      const projectName = options.name;
      const outputPath = path.join(baseOutputPath, projectName);
      
      // Asegurar que la carpeta output existe
      await fs.ensureDir(baseOutputPath);
      
      // Generar el proyecto completo
      const result = await generator.generateBackend(description, outputPath, finalOptions);
      
      console.log(`\n🎉 Proyecto generado con éxito en: ${outputPath}`);
      
      rl.close();
    } catch (error) {
      console.error('\n❌ Error al generar la vista previa:', error);
      rl.close();
      process.exit(1);
    }
  });

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

// Comando para guardar una configuración de proyecto
program
  .command('save')
  .description('Guarda la configuración de un proyecto para uso futuro')
  .argument('<description>', 'Descripción del proyecto')
  .option('-n, --name <n>', 'Nombre del proyecto', 'proyecto-api')
  .option('-d, --database <db>', 'Base de datos a utilizar', 'MongoDB')
  .option('-f, --framework <framework>', 'Framework a utilizar', 'Express')
  .option('-a, --auth <auth>', 'Método de autenticación', 'JWT')
  .option('--graphql', 'Incluir GraphQL', false)
  .option('--websockets', 'Incluir WebSockets', false)
  .option('--global-query', 'Incluir consulta global para administradores', false)
  .action(async (description, options) => {
    try {
      console.log(`\n💾 Guardando configuración para proyecto "${options.name}"...`);
      console.log(`📝 Descripción: "${description}"`);
      console.log(`⚙️ Configuración:`);
      console.log(`  - Base de datos: ${options.database}`);
      console.log(`  - Framework: ${options.framework}`);
      console.log(`  - Autenticación: ${options.auth}`);
      console.log(`  - GraphQL: ${options.graphql ? 'Sí' : 'No'}`);
      console.log(`  - WebSockets: ${options.websockets ? 'Sí' : 'No'}`);
      console.log(`  - Consulta global: ${options.globalQuery ? 'Sí' : 'No'}`);
      
      // Generar vista previa de la arquitectura
      const { architecture } = await generator.generatePreview(description, {
        database: options.database,
        framework: options.framework,
        auth: options.auth,
        includeGraphQL: options.graphql,
        includeWebsockets: options.websockets,
        includeGlobalQuery: options.globalQuery
      });
      
      // Guardar la configuración
      const finalOptions = {
        name: options.name,
        database: options.database,
        framework: options.framework,
        auth: options.auth,
        includeGraphQL: options.graphql,
        includeWebsockets: options.websockets,
        includeGlobalQuery: options.globalQuery,
        useTemplates: true,
        generateZip: true,
        continueOnError: true
      };
      
      const result = await generator.saveProjectConfiguration(
        options.name,
        description,
        finalOptions,
        architecture
      );
      
      if (result.success) {
        console.log(`\n✅ Configuración guardada con éxito en: ${result.configPath}`);
        console.log(`Para generar este proyecto, usa: softarch generate-saved ${options.name}`);
      } else {
        console.log(`\n❌ Error al guardar la configuración: ${result.message}`);
      }
    } catch (error) {
      console.error('Error al guardar la configuración:', error);
      process.exit(1);
    }
  });

// Comando para listar proyectos guardados
program
  .command('list-saved')
  .description('Lista todos los proyectos guardados localmente')
  .action(async () => {
    try {
      console.log('Obteniendo lista de proyectos guardados...');
      
      const projects = await generator.listSavedProjects();
      
      if (projects.length === 0) {
        console.log('\n⚠️ No hay proyectos guardados.');
        console.log('Para guardar un proyecto, usa: softarch save <descripción> --name <nombre>');
        return;
      }
      
      console.log(`\n📋 Proyectos guardados (${projects.length}):`);
      
      projects.forEach((project, index) => {
        console.log(`\n${index + 1}. ${project.name}`);
        console.log(`   Descripción: ${project.description?.substring(0, 60)}${project.description?.length > 60 ? '...' : ''}`);
        console.log(`   Base de datos: ${project.database || 'No especificada'}`);
        console.log(`   Framework: ${project.framework || 'No especificado'}`);
        console.log(`   Fecha: ${new Date(project.createdAt).toLocaleString()}`);
      });
      
      console.log('\nPara generar un proyecto guardado: softarch generate-saved <nombre>');
    } catch (error) {
      console.error('Error al listar proyectos guardados:', error);
      process.exit(1);
    }
  });

// Comando para generar un proyecto desde una configuración guardada
program
  .command('generate-saved')
  .description('Genera un proyecto a partir de una configuración guardada')
  .argument('<name>', 'Nombre del proyecto guardado')
  .option('-o, --output <path>', 'Ruta de salida personalizada')
  .action(async (name, options) => {
    try {
      const outputPath = options.output ? path.resolve(options.output) : null;
      
      console.log(`\n🔄 Generando proyecto desde la configuración guardada: "${name}"`);
      
      const result = await generator.generateFromSaved(name, outputPath);
      
      console.log(`\n🎉 Proyecto generado con éxito en: ${result.outputPath}`);
    } catch (error) {
      console.error('Error al generar el proyecto desde configuración guardada:', error);
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

// Comando para generar una API GraphQL
program
  .command('graphql')
  .description('Genera una API GraphQL basada en una descripción')
  .argument('<description>', 'Descripción de la API GraphQL')
  .option('-o, --output <path>', 'Ruta de salida', './output')
  .option('-n, --name <n>', 'Nombre del proyecto', 'graphql-api')
  .option('-d, --database <db>', 'Base de datos a utilizar', 'MongoDB')
  .option('-a, --auth <auth>', 'Método de autenticación', 'JWT')
  .option('--use-existing-models', 'Usar modelos existentes en el proyecto', false)
  .option('-i, --interactive', 'Modo interactivo con previsualización y recomendaciones', false)
  .action(async (description, options) => {
    try {
      // Si se solicita modo interactivo, usar el flujo de previsualización
      if (options.interactive) {
        // Redirigir al comando preview con la opción graphql activada
        const previewOptions = {
          name: options.name,
          database: options.database,
          auth: options.auth,
          output: options.output,
          graphql: true
        };
        
        // Ejecutar el flujo de preview
        await program.commands.find(cmd => cmd.name() === 'preview').action(description, previewOptions);
        return;
      }
      
      // Asegurar que se usa el nombre del proyecto dentro de la carpeta output
      const baseOutputPath = path.resolve(options.output);
      const projectName = options.name;
      const outputPath = path.join(baseOutputPath, projectName);
      
      console.log(`\n🚀 Generando API GraphQL: "${projectName}"`);
      console.log(`📝 Descripción: ${description}`);
      console.log(`📁 Ruta de salida: ${outputPath}`);
      console.log(`💾 Base de datos: ${options.database}`);
      console.log(`🔐 Autenticación: ${options.auth}`);
      console.log(`🔄 Usar modelos existentes: ${options.useExistingModels ? 'Sí' : 'No'}`);
      
      // Asegurar que la carpeta output existe
      await fs.ensureDir(baseOutputPath);
      
      // Generar la API GraphQL
      const result = await generator.generateGraphQLAPI(description, outputPath, {
        name: projectName,
        database: options.database,
        auth: options.auth,
        useExistingModels: options.useExistingModels
      });
      
      console.log('\n✅ API GraphQL generada con éxito!');
      console.log(`📁 Ubicación del proyecto: ${outputPath}`);
      console.log(`📊 Total de modelos: ${result.models.length}`);
      console.log(`\n💡 Para iniciar el servidor GraphQL:`);
      console.log(`   cd ${outputPath}`);
      console.log(`   npm install`);
      console.log(`   npm run start:graphql`);
      console.log(`\n🔍 El playground de GraphQL estará disponible en: http://localhost:4000/graphql`);
    } catch (error) {
      console.error('Error al generar la API GraphQL:', error);
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
  .option('-d, --database <db>', 'Base de datos a utilizar (dejar vacío para recomendación automática)')
  .option('-f, --framework <framework>', 'Framework a utilizar (dejar vacío para recomendación automática)')
  .option('-a, --auth <auth>', 'Método de autenticación (dejar vacío para recomendación automática)')
  .option('--global-query', 'Incluir consulta global para administradores', false)
  .option('--use-templates', 'Usar plantillas CRUD predefinidas', true)
  .option('--zip', 'Generar archivo ZIP del proyecto', true)
  .option('--edit', 'Permitir edición manual antes de finalizar', false)
  .option('--continue-on-error', 'Continuar generación si hay errores', true)
  .option('--skip-mongodb', 'No guardar en MongoDB, solo en archivo local', false)
  .option('--with-graphql', 'Incluir una API GraphQL integrada', false)
  .option('-i, --interactive', 'Modo interactivo con previsualización y recomendaciones', false)
  .action(async (description, options) => {
    try {
      // Si se solicita modo interactivo, usar el flujo de previsualización
      if (options.interactive) {
        // Redirigir al comando preview
        const previewOptions = {
          name: options.name,
          database: options.database,
          framework: options.framework,
          auth: options.auth,
          output: options.output,
          graphql: options.withGraphql
        };
        
        // Ejecutar el flujo de preview
        await program.commands.find(cmd => cmd.name() === 'preview').action(description, previewOptions);
        return;
      }
      
      // Si no hay modo interactivo pero no se especificaron algunas opciones,
      // usar el agente de IA para obtener recomendaciones automáticas
      let enrichedOptions = { ...options };
      
      if (!options.database || !options.framework || !options.auth) {
        console.log('\n🤖 Solicitando recomendaciones automáticas al agente de IA...');
        const { options: recommendedOptions } = await generator.interactWithAgent(description, options);
        
        // Usar recomendaciones solo para las opciones no especificadas
        if (!options.database) {
          enrichedOptions.database = recommendedOptions.database;
          console.log(`💾 Base de datos recomendada: ${enrichedOptions.database}`);
        }
        
        if (!options.framework) {
          enrichedOptions.framework = recommendedOptions.framework;
          console.log(`🚀 Framework recomendado: ${enrichedOptions.framework}`);
        }
        
        if (!options.auth) {
          enrichedOptions.auth = recommendedOptions.auth;
          console.log(`🔐 Autenticación recomendada: ${enrichedOptions.auth}`);
        }
        
        // Preguntar si se quiere usar GraphQL si no fue especificado
        if (options.withGraphql === undefined && recommendedOptions.includeGraphQL !== undefined) {
          enrichedOptions.includeGraphQL = recommendedOptions.includeGraphQL;
          console.log(`📊 GraphQL: ${enrichedOptions.includeGraphQL ? 'Recomendado' : 'No recomendado'}`);
        }
        
        // Preguntar si se quiere usar consulta global si no fue especificado
        if (options.globalQuery === undefined && recommendedOptions.includeGlobalQuery !== undefined) {
          enrichedOptions.includeGlobalQuery = recommendedOptions.includeGlobalQuery;
          console.log(`🔍 Consulta global: ${enrichedOptions.includeGlobalQuery ? 'Recomendada' : 'No recomendada'}`);
        }
      }
      
      // Asegurar que se usa el nombre del proyecto dentro de la carpeta output
      const baseOutputPath = path.resolve(options.output);
      const projectName = options.name;
      const outputPath = path.join(baseOutputPath, projectName);
      
      console.log(`\nGenerando proyecto completo: "${projectName}"`);
      console.log(`Descripción: ${description}`);
      console.log(`Ruta de salida: ${outputPath}`);
      console.log(`Base de datos: ${enrichedOptions.database}`);
      console.log(`Framework: ${enrichedOptions.framework}`);
      console.log(`Autenticación: ${enrichedOptions.auth}`);
      console.log(`Usando plantillas CRUD: ${options.useTemplates ? 'Sí' : 'No'}`);
      console.log(`Generar ZIP: ${options.zip ? 'Sí' : 'No'}`);
      console.log(`Permitir edición previa: ${options.edit ? 'Sí' : 'No'}`);
      console.log(`Continuar en caso de error: ${options.continueOnError ? 'Sí' : 'No'}`);
      console.log(`Usar MongoDB: ${!options.skipMongodb ? 'Sí' : 'No'}`);
      console.log(`Incluir GraphQL: ${enrichedOptions.includeGraphQL ? 'Sí' : 'No'}`);
      
      // Asegurar que la carpeta output existe
      await fs.ensureDir(baseOutputPath);
      
      const result = await generator.generateCompleteProject(description, outputPath, {
        name: projectName,
        database: enrichedOptions.database,
        framework: enrichedOptions.framework,
        auth: enrichedOptions.auth,
        includeGlobalQuery: enrichedOptions.includeGlobalQuery || options.globalQuery,
        useTemplates: options.useTemplates,
        generateZip: options.zip,
        allowPreviewEdit: options.edit,
        continueOnError: options.continueOnError,
        skipMongodb: options.skipMongodb,
        includeGraphQL: enrichedOptions.includeGraphQL || options.withGraphql
      });
      
      if (result.success) {
        console.log(`\n🎉 Proyecto completo generado con éxito!`);
        console.log(`📁 Ubicación: ${outputPath}`);
        
        if (result.zipPath) {
          console.log(`🗜️ Archivo ZIP: ${result.zipPath}`);
          console.log('  Puedes descargar este archivo para compartir el proyecto completo.');
        }
        
        if (result.diagramId) {
          console.log(`🗄️ Diagrama guardado en MongoDB con ID: ${result.diagramId}`);
        } else if (!options.skipMongodb) {
          console.log(`⚠️ No se pudo guardar el diagrama en MongoDB, pero el proyecto se generó correctamente.`);
          if (fs.existsSync(path.join(outputPath, 'diagram.json'))) {
            console.log(`📊 Se guardó una copia local del diagrama en: ${path.join(outputPath, 'diagram.json')}`);
          }
        }
        
        // Si se incluyó GraphQL, mostrar información adicional
        if ((enrichedOptions.includeGraphQL || options.withGraphql) && result.graphqlPath) {
          console.log(`\n🚀 API GraphQL generada en: ${result.graphqlPath}`);
          console.log(`🔍 El playground de GraphQL estará disponible en: http://localhost:4000/graphql`);
        }
      } else {
        console.log(`\n⚠️ La generación del proyecto se completó con advertencias.`);
        console.log(`📁 Los archivos generados están disponibles en: ${outputPath}`);
        console.log(`Para continuar la generación, ejecuta el mismo comando nuevamente.`);
      }
    } catch (error) {
      console.error('\n❌ Error al generar el proyecto completo:', error);
      console.log('\nPara intentar recuperar la generación, ejecuta el mismo comando nuevamente.');
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
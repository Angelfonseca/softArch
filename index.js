#!/usr/bin/env node

/**
 * Punto de entrada principal para la herramienta SoftArch
 * Generador de arquitecturas API con IA (Deepseek)
 */
require('dotenv').config();
const program = require('./src/cli');

// Verificar que la clave API de Deepseek esté configurada
if (!process.env.DEEPSEEK_API_KEY && process.argv.length > 2) {
  console.warn('\n⚠️  ADVERTENCIA: No se ha configurado DEEPSEEK_API_KEY.');
  console.warn('Se utilizará una simulación de respuestas para desarrollo.\n');
}

// Iniciar la aplicación CLI
program.parse(process.argv);

// Si no se proporcionan argumentos, mostrar la ayuda
if (process.argv.length <= 2) {
  program.help();
}
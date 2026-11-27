// Copies Bootstrap files into vendor/ so the app works offline (no CDN).
import { cpSync, mkdirSync } from 'node:fs';

mkdirSync('vendor/bootstrap/css', { recursive: true });
mkdirSync('vendor/bootstrap/js', { recursive: true });
mkdirSync('vendor/bootstrap-icons', { recursive: true });

cpSync('node_modules/bootstrap/dist/css/bootstrap.min.css', 'vendor/bootstrap/css/bootstrap.min.css');
cpSync('node_modules/bootstrap/dist/js/bootstrap.bundle.min.js', 'vendor/bootstrap/js/bootstrap.bundle.min.js');
cpSync('node_modules/bootstrap-icons/font/bootstrap-icons.min.css', 'vendor/bootstrap-icons/bootstrap-icons.min.css');
cpSync('node_modules/bootstrap-icons/font/fonts', 'vendor/bootstrap-icons/fonts', { recursive: true });
mkdirSync('vendor/chartjs', { recursive: true });
cpSync('node_modules/chart.js/dist/chart.umd.js', 'vendor/chartjs/chart.umd.js');
console.log('Vendor files copied.');

import { compile } from '@tailwindcss/node';
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as lucide from 'lucide';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(process.argv[2] || 'dist', 'assets');
const compiler = await compile('@import "./entry.css";', { base: resolve(root, 'ui'), onDependency() {} });

const icons = {
  search: lucide.Search, 'panel-left': lucide.PanelLeftClose,
  insurance: lucide.ShieldCheck, treatment: lucide.BookOpen,
  travel: lucide.Navigation, hours: lucide.Clock, financing: lucide.CreditCard,
  vitamins: lucide.Pill, messages: lucide.MessageSquare, voicemail: lucide.Voicemail,
  resources: lucide.Link, templates: lucide.FileText, calendar: lucide.CalendarDays,
  'sign-out': lucide.LogOut, clinic: lucide.MapPin, infusion: lucide.Droplet, spray: lucide.SprayCan,
  activity: lucide.Activity, info: lucide.Info, 'arrow-up-right': lucide.ArrowUpRight,
  check: lucide.Check, close: lucide.X, inbox: lucide.Inbox,
  user: lucide.UserRound, 'account-toggle': lucide.ChevronsUpDown, palette: lucide.Palette,
  phone: lucide.Phone, copy: lucide.Copy, sun: lucide.Sun, moon: lucide.Moon
};

const symbols = Object.entries(icons).map(([name, nodes]) => {
  const content = nodes.map(([tag, attrs]) => {
    const attributes = Object.entries(attrs).map(([key, value]) => `${key}="${value}"`).join(' ');
    return `<${tag} ${attributes}/>`;
  }).join('');
  return `<symbol id="${name}" viewBox="0 0 24 24">${content}</symbol>`;
});

await mkdir(output, { recursive: true });
await Promise.all([
  writeFile(resolve(output, 'renue-ui.css'), compiler.build([])),
  writeFile(resolve(output, 'renue-icons.svg'), `<svg xmlns="http://www.w3.org/2000/svg">${symbols.join('')}</svg>\n`),
  copyFile(resolve(root, 'node_modules/lucide/LICENSE'), resolve(output, 'lucide-license.txt')),
  copyFile(resolve(root, 'node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2'), resolve(output, 'inter.woff2')),
  copyFile(resolve(root, 'node_modules/@fontsource-variable/inter/LICENSE'), resolve(output, 'inter-license.txt'))
]);

import chalk from 'chalk';

export default function displayBanner() {

    console.log(chalk.yellow('\n════════════════════════════════════════════════════════'));
    console.log(chalk.white(`Started at: ${new Date().toLocaleString()}`));
    console.log(chalk.yellow('════════════════════════════════════════════════════════\n'));
}

import readline from 'readline';
// 创建一个接口
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
function confirm(message) {
    return new Promise((resolve, reject) => {
        rl.question(message, (answer) => {
            rl.close();
            if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
                resolve(true);
            }
            else {
                reject('操作已取消');
            }
        });
    });
}
export default confirm;

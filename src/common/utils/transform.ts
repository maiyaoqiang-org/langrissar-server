// 脱敏处理函数
export const desensitizePhone = ({ value }) => {
    if (value) {
        return value.replace(/(.{3})(.+)(.{4})/, (_, prefix, middle, suffix) => {
            return `${prefix}${'*'.repeat(middle.length)}${suffix}`;
        });
    }
    return value;
};
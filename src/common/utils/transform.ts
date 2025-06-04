// 脱敏处理函数
export const desensitizePhone = ({ value }) => {
    if (value) {
        return value.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
    }
    return value;
};
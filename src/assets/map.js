import { reactive } from 'vue';
export const titleMap = reactive({
  time: '账单时间',
  type: '账单类型',
  category: '账单分类',
  amount: '账单金额'
})
export const timeResolve = (val) => {
  const date = new Date(+val)
  date.setHours(date.getHours(), date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString()
}

export const priceRound = (val) => {
  return Math.round(val * 100) / 100
}

export const rules = reactive({
  type: [
    {
      required: true,
      message: "请选择类型",
      trigger: "blur",
    },
  ],
  time: [
    {
      required: true,
      message: "请选择时间",
      trigger: "blur",
    },
  ],
  category: [
    {
      required: true,
      message: "请填写账单分类",
      trigger: "blur",
    },
  ],
  amount: [
    {
      required: true,
      message: "请填写账单金额",
      trigger: "blur",
    },
    {
      validator: (rule, value, callback) => {
        const price = /^[0-9]*$/;
        if (!price.test(value)) {
          callback(new Error("金额只能为数字"));
        } else {
          callback();
        }
      },
      message: "必须为数字",
      trigger: "blur",
    },
  ],
});

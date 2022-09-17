<template>
  <div>
    <el-row>
      <el-button
        type="primary"
        plain
        size="large"
        @click="showAppendDialog = true"
      >
        添加账单
      </el-button>
      <el-button
        type="warning"
        plain
        size="large"
        @click="handleDownload"
        :loading="showLoading"
      >
        <template #loading>
          <div class="custom-loading">
            <svg class="circular" viewBox="-10, -10, 50, 50">
              <path
                class="path"
                d="
            M 30 15
            L 28 17
            M 25.61 25.61
            A 15 15, 0, 0, 1, 15 30
            A 15 15, 0, 1, 1, 27.99 7.5
            L 15 15
          "
                style="stroke-width: 4px; fill: rgba(0, 0, 0, 0)"
              />
            </svg>
          </div>
        </template>
        下载csv
      </el-button>
    </el-row>
    <el-table
      :data="dataList"
      border
      :summary-method="getSummaries"
      show-summary
      @sort-change="handleSortList"
    >
      <el-table-column label="账单类型" prop="type" min-width="200">
        <template v-slot="{ row }">
          {{ +row.type === 0 ? "支出" : +row.type === 1 ? "收入" : "--" }}
        </template>
      </el-table-column>
      <el-table-column
        label="账单时间"
        prop="time"
        min-width="240"
        :filters="monthSort"
        :filter-method="filterDateHandler"
      >
        <template v-slot="{ row }">
          {{ timeResolve(row.time) }}
        </template>
      </el-table-column>
      <el-table-column
        label="账单分类"
        prop="category"
        min-width="200"
        :filters="cateFilter"
        :filter-method="filterCateHandler"
      >
        <template v-slot="{ row }">
          {{ cateList.get(row.category)?.name }}
        </template>
      </el-table-column>
      <el-table-column
        label="账单金额"
        prop="amount"
        min-width="100"
        sortable
        align="center"
      >
        <template v-slot="{ row }"> {{ priceRound(row.amount) }}元 </template>
      </el-table-column>
    </el-table>
    <el-dialog width="600px" title="添加账单" v-model="showAppendDialog">
      <el-form ref="ruleFormRef" :rules="rules" :model="form">
        <el-form-item label="账单类型" prop="type">
          <el-select
            style="width: 200px"
            v-model="form.type"
            placeholder="请选择账单类型"
          >
            <el-option label="收入" :value="1" />
            <el-option label="支出" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item label="账单时间" prop="time">
          <el-date-picker
            style="width: unset; flex-grow: 1"
            placeholder="请选择账单时间"
            type="datetime"
            v-model="form.time"
            format="YYYY/MM/DD hh:mm:ss"
            value-format="x"
          >
          </el-date-picker>
        </el-form-item>
        <el-form-item label="账单分类" prop="category">
          <el-select
            style="width: 200px"
            v-model="form.category"
            placeholder="请选择账单分类"
          >
            <el-option
              v-for="item in cateFilter"
              :label="item.text"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="账单金额" prop="amount">
          <el-input
            style="width: 100px"
            placeholder="请填写账单金额"
            v-model.number="form.amount"
          >
          </el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-row class="dialog-footer">
          <el-button round plain size="large" @click="showAppendDialog = false"
            >取消</el-button
          >
          <el-button
            round
            plain
            size="large"
            type="primary"
            @click="handleComfirm(ruleFormRef)"
            >添加</el-button
          >
        </el-row>
      </template>
    </el-dialog>
    <div id="mychart"></div>
  </div>
</template>
<script setup>
import { titleMap, timeResolve, priceRound, rules } from "@/assets/map";
import { ElMessage } from "element-plus";
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import * as echarts from "echarts";

//筛选部分
const filterDateHandler = (value, row, column) => {
  const property = column["property"];
  return new Date(+row[property]).getMonth() + 1 === value;
};
const filterCateHandler = (value, row, column) => {
  const property = column["property"];
  return row[property] === value;
};

//总金额部分
const getSummaries = (param) => {
  const { columns, data } = param;
  const sums = [];
  columns.forEach((column, index) => {
    if (index === 0) {
      return (sums[index] = "收入总金额");
    }
    if (index === 2) {
      return (sums[index] = "支出总金额");
    }
    const values = data.map((item) => Number(item[column.property]));
    if (!values.every((value) => Number.isNaN(value)) && index === 3) {
      sums[1] = `${values.reduce((prev, curr) => {
        return prev + (curr >= 0 ? curr : 0);
      }, 0)}元`;
      sums[3] = `${values.reduce((prev, curr) => {
        return prev + (curr < 0 ? curr : 0);
      }, 0)}元`;
    }
  });
  return sums;
};

//表单部分
let showAppendDialog = ref(false);
const form = reactive({
  type: "",
  time: "",
  category: "",
  amount: "",
});
const ruleFormRef = ref();
const handleComfirm = (ruleFormRef) => {
  ruleFormRef.validate((valid, field) => {
    if (valid) {
      ElMessage({
        message: "添加成功",
        type: "success",
      });
      dataList.push({
        type: form.type,
        time: form.time + "",
        category: form.category,
        amount: form.amount,
      });
      form.type = "";
      form.time = "";
      form.category = "";
      form.amount = "";
      setChartOption();
      showAppendDialog.value = false;
    }
  });
};

//获取资源部分
let title = reactive([]); //表头
let dataList = reactive([]);
const getList = () => {
  fetch("/bill.csv")
    .then((response) => {
      return response.text();
    })
    .then((str) => {
      const arr = str.split("\n");
      const resolve = arr.map((item) => item.split(","));
      title.push(...resolve[0]);
      const temp = [];
      resolve.slice(1).forEach((item) => {
        const temp1 = {};
        title.forEach((item1, index) => {
          temp1[item1] = item[index];
          if (index === 3) {
            temp1[item1] = +temp1[item1];
          }
        });
        temp.push(temp1);
      });
      dataList.push(...temp);
      setChartOption();
    });
};
const getCaregories = () => {
  fetch("/categories.csv")
    .then((response) => {
      return response.text();
    })
    .then((str) => {
      const arr = str.split("\n");
      const resolve = arr.map((item) => item.split(","));
      cateTitle.push(...resolve[0]);
      resolve.slice(1).forEach((item) => {
        const temp1 = {};
        cateTitle.forEach((item1, index) => {
          temp1[item1] = item[index];
        });
        cateList.set(item[0], temp1);
      });
    });
};

//筛选部分
let cateList = reactive(new Map());
let cateTitle = reactive([]);
const cateFilter = computed(() => {
  const temp = [];
  cateList.forEach((item, index) => {
    temp.push({ text: item.name, value: item.id, type: item.type });
  });
  return temp;
});
const monthSort = computed(() => {
  const currentMonths = new Set();
  dataList.forEach((item, index) => {
    currentMonths.add(new Date(+item.time).getMonth() + 1);
  });
  const months = [];
  currentMonths.forEach((item) => {
    months.push({ text: item + "月", value: item });
  });
  return months;
});

//排序部分
let sortStatus = ref("");
const handleSortList = (val) => {
  sortStatus.value = val.order;
};

//下载部分
let showLoading = ref(false);
const handleDownload = () => {
  showLoading.value = true;
  setTimeout(() => {
    showLoading.value = false;
  }, 3000);
  const tempDataList = JSON.parse(JSON.stringify(dataList));
  if (sortStatus.value === "ascending") {
    tempDataList.sort((val1, val2) => {
      return val1.amount - val2.amount;
    });
  } else if (sortStatus.value === "descending") {
    tempDataList.sort((val1, val2) => {
      return val2.amount - val1.amount;
    });
  }
  let result = title.join(",") + "\n";
  result += tempDataList
    .map((item) => {
      let str = "";
      for (let i in item) {
        str = str + item[i] + ",";
      }
      return str.slice(0, str.length - 1);
    })
    .join("\n");
  const blob = new Blob([result], {
    type: "text/plain;charset=utf-8",
  });
  const objectURL = URL.createObjectURL(blob);
  const aTag = document.createElement("a");
  aTag.href = objectURL;
  aTag.download = "bill.csv";
  aTag.click();
  URL.revokeObjectURL(objectURL);
};

getList();
getCaregories();

//echarts
let myChart = ref(null);
const setChartOption = () => {
  const chartList = JSON.parse(JSON.stringify(dataList));
  chartList.sort((val1, val2) => {
    return val1.time - val2.time;
  });
  const xAxisData = chartList.map((item) => {
    let date = new Date(+item.time);
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  });
  const firstLegend = chartList.map((item) => {
    return item.amount;
  });
  let maxAmount = Math.max.apply(null, firstLegend);
  let minAmount = Math.min.apply(null, firstLegend);
  const option = {
    title: {
      text: "收入支出情况折线图",
    },
    tooltip: {
      trigger: "axis",
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "12%",
      containLabel: true,
    },
    toolbox: {
      right: "4%",
      feature: {
        dataZoom: {
          yAxisIndex: "none",
        },
        restore: {},
        saveAsImage: {},
      },
    },
    xAxis: {
      top: "2%",
      type: "category",
      boundaryGap: true,
      data: xAxisData,
    },
    yAxis: {
      type: "value",
      axisLine: {
        //轴线
        show: true,
        lineStyle: {
          color: "#999",
        },
      },
    },
    dataZoom: [
      {
        startValue: xAxisData[0],
        backgroundColor: "rgba(47, 69, 84, 0)",
        start: 200,
        bottom: "10",
      },
      {
        type: "inside",
      },
    ],
    visualMap: {
      top: 50,
      right: 10,
      pieces: [
        {
          lt: minAmount / 1.5,
          color: "#93CE07",
        },
        {
          gt: minAmount / 1.5,
          lte: minAmount / 3,
          color: "#FBDB0F",
        },
        {
          gt: minAmount / 3,
          lte: 0,
          color: "#FC7D02",
        },
        {
          gt: 0,
          lte: maxAmount / 3,
          color: "#FD0100",
        },
        {
          gt: maxAmount / 3,
          lte: maxAmount / 1.5,
          color: "#AA069F",
        },
        {
          gt: maxAmount / 1.5,
          color: "#AC3B2A",
        },
      ],
    },
    series: [
      {
        name: "收入支出",
        type: "line",
        stack: "Total",
        data: firstLegend,
      },
    ],
  };
  option && myChart.setOption(option);
};

const resizeChart = () => {
  myChart.resize();
};
onMounted(() => {
  const chartDom = document.getElementById("mychart");
  myChart = echarts.init(chartDom);
  window.addEventListener("resize", resizeChart);
});
onBeforeUnmount(() => {
  window.removeEventListener("resize", resizeChart);
});
</script>

<style scoped lang="scss">
table {
  width: 80%;
}
.el-select,
.el-input {
  flex-grow: 1;
}
.el-button {
  width: 200px;
}

.dialog-footer {
  width: 100%;
  justify-content: center;
}

.el-button .custom-loading .circular {
  margin-right: 6px;
  width: 18px;
  height: 18px;
  animation: loading-rotate 2s linear infinite;
}
.el-button .custom-loading .circular .path {
  animation: loading-dash 1.5s ease-in-out infinite;
  stroke-dasharray: 90, 150;
  stroke-dashoffset: 0;
  stroke-width: 2;
  stroke: var(--el-button-text-color);
  stroke-linecap: round;
}
#mychart {
  width: 100%;
  height: 400px;
}
</style>

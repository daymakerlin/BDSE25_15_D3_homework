//Data utilities
//遇到NA就設定為undefined, 要不然就維持原本的字串
const parseNA = string => (string === 'NA' ? undefined : string);
//日期處理
const parseDate = string => d3.timeParse('%Y-%m-%d')(string);

// + 轉換成數字
// 非數字用parseNA,日期用parseDate
function type(d) {
    const date = parseDate(d.release_date); //以日期去分(創日期變數)
    return {
        budget: +d.budget,
        genre: parseNA(d.genre),
        genres: JSON.parse(d.genres).map(d => d.name),
        homepage: parseNA(d.homepage),
        id: +d.id,
        imdb_id: parseNA(d.imdb_id),
        original_language: parseNA(d.original_language),
        overview: parseNA(d.overview),
        popularity: +d.popularity,
        poster_path: parseNA(d.poster_path),
        production_countries: JSON.parse(d.production_countries),
        release_date: date,          //上面處理過直接用
        release_year: date.getFullYear(),  //增加資料欄位:年份
        revenue: +d.revenue,
        runtime: +d.runtime,
        tagline: parseNA(d.tagline),
        title: parseNA(d.title),
        vote_average: +d.vote_average,
        vote_count: +d.vote_count,
    }
}

//Data selection
function filterData(data) {
    return data.filter(
        d => {
            return (
                d.release_year > 1999 && d.release_year < 2010 &&
                d.revenue > 0 &&
                d.budget > 0 &&
                d.genre &&
                d.title
            );
        }
    );
}


function prepareBarChartData(data) {
    console.log(data);
    const dataMap = d3.rollup(
        data, //送資料
        v => d3.sum(v, leaf => leaf.revenue), //將revenue加總
        d => d.genre //依電影分類groupby
    );
    const dataArray = Array.from(dataMap, d => ({ genre: d[0], revenue: d[1] }));
    return dataArray;
}

function prepareScatterData(data) {
    return data.sort((a, b) => b.budget - a.budget).filter((d, i) => i < 100);
}


//Main
function ready(movies) {
    const movieClean = filterData(movies);
    const scatterData = prepareScatterData(movieClean);
    console.log(scatterData);
    setupCanvas(scatterData);
}
d3.csv('data/movies.csv', type).then(
    res => {
        ready(res);
    }
);

function setupCanvas(scatterData) {
    const svg_width = 500;
    const svg_height = 500;
    const chart_margin = { top: 80, right: 40, bottom: 40, left: 80 };
    const chart_width = svg_width - (chart_margin.left + chart_margin.right);
    const chart_height = svg_height - (chart_margin.top + chart_margin.bottom);

    //Draw Scatter Base
    const this_svg = d3.select('.scatter-plot-container').append('svg')
        .attr('width', svg_width).attr('height', svg_height)
        .append('g')
        .attr('transform', `translate(${chart_margin.left},${chart_margin.top})`);

    //scale
    //d3.extent find the max & min in budget
    const xExtent = d3.extent(scatterData, d => d.budget);
    const xScale = d3.scaleLinear().domain(xExtent).range([0, chart_width]);
    //垂直空間的分配 - 平均分布給各種類
    const yExtent = d3.extent(scatterData, d => d.revenue)
    const yScale = d3.scaleLinear().domain(yExtent).range([chart_height, 0]);//營收最小的放最下方，與座標相反


    //Draw Scatters
    this_svg.selectAll('.scatter').data(scatterData).enter()
        .append('circle')
        .attr('class', 'scatter')
        .attr('cx', d => xScale(d.budget))
        .attr('cy', d => yScale(d.revenue))
        .attr('r', 3)
        .style('fill', 'dodgerblue')
        .style('fill-opacity', 0.5);


    //ticks 決定約略有幾個刻度(依數值狀況)
    const xAxis = d3.axisBottom(xScale).ticks(5).tickFormat(formatTicks)
        .tickSizeInner(-chart_height).tickSizeOuter(0);
    const xAxisDraw = this_svg.append('g').attr('class', 'x axis')
        .attr('transform', `translate(-10,${chart_height + 10})`)
        .call(xAxis)
        .call(addLabel, 'Budget', 25, 0);
    //拉開字與軸的距離
    xAxisDraw.selectAll('text').attr('dy', '2em');

    const yAxis = d3.axisLeft(yScale).ticks(5).tickFormat(formatTicks)
        .tickSizeInner(-chart_height).tickSizeOuter(0);
    const yAxisDraw = this_svg.append('g').attr('class', 'y axis')
        .attr('transform', `translate(-10,10)`)
        .call(yAxis)
        .call(addLabel, 'Revenue', -30, -30);
    //拉開字與軸的距離
    yAxisDraw.selectAll('text').attr('dx', '-2em');

    //Draw header
    const header = this_svg.append('g').attr('class', 'bar-header')
        .attr('transform', `translate(0,${-chart_margin.top / 2})`)
        .append('text');
    header.append('tspan').text('Budget vs. Revenue in $US');
    header.append('tspan').text('Top 100 films by budget, 2000-2009')
        .attr('x', 0).attr('y', 20).style('font-size', '0.8em').style('fill', '#555');

}
function addLabel(axis, label, x, y) {
    /* axis 是呼叫者 - 哪一個軸 */
    axis.selectAll('.tick:last-of-type text')
        .clone()
        .text(label)
        .attr('x', x)
        .attr('y', y)
        .style('text-anchor', 'start')
        .style('font-weight', 'bold')
        .style('fill', '#555');
}

function formatTicks(d) {
    return d3.format('~s')(d)
        .replace('M', 'mil')
        .replace('G', 'bil')
        .replace('T', 'tri')
}
d3.csv('data.csv', (err, data) => {
    data = data.filter(d => d.downloaded == 1).map(d => {
        d.ratings_count = +d.ratings_count;
        d.average_rating = +d.average_rating;
        d.ln_ratings_count = d.ratings_count > 0 ? Math.log(+d.ratings_count) : 0;
        return d;
    });

    let width = 800,
        height = 800,
        margin = { top: 150, left: 80, bottom: 50, right: 50 };

    let svg = d3.select('#draw')
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    let g = svg.append('g')
        .attr('width', width - margin.left - margin.right)
        .attr('height', height - margin.top - margin.bottom)
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    let bigbookW = 90,
        bigbookH = 150,
        smallbookW = 20,
        smallbookH = 25;
    let xDomain = [0, 5.5],
        yDomain = d3.extent(data, d => d.ln_ratings_count);
    let colWidth = (width - margin.left - margin.right) / 5;
    let xScale = d3.scaleLinear().domain(xDomain).range([0, width - margin.left - margin.right]),
        yScale = d3.scaleLinear().domain(yDomain).range([height - margin.top - margin.bottom, 0]);

    g.append('g')
        .attr('transform', 'translate(0,' + (height - margin.top - margin.bottom) + ')').call(d3.axisBottom().scale(xScale))
        .append("text")
        .attr("transform", "translate(" + (height - margin.top - margin.bottom) / 2 + ",30)")
        .text("Average Ratings")
        .attr("fill", "#000")
        .style("text-anchor", "start");

    g.append('g').call(d3.axisLeft().scale(yScale)).append("text").text("Log(Ratings Count)").attr("fill", "#000").style("text-anchor", "middle").attr("dy", "-5");
    d3.range(1, 6, 1).map(d => { g.append('g').attr('class', 'grid').attr('transform', 'translate(' + xScale(d) + ',0)').call(d3.axisLeft().scale(yScale).tickValues([])); });

    let books = g.append('g')
        .selectAll('foreignObject')
        .data(data)
        .enter()
        .append('foreignObject')
        .sort((a, b) => b.ln_ratings_count - a.ln_ratings_count)
        .attr('width', bigbookW)
        .attr('height', bigbookH);

    books.attr('x', (d, i) => (width - margin.left - margin.right) / 2)
        .attr('y', (d, i) => -bigbookH)
        .append('xhtml:img')
        .attr('src', d => {
            return 'covers/' + d.cover_id;
        })
        .attr('width', bigbookW)
        .attr('height', bigbookH);

    books.transition()
        .duration(5000)
        .delay(d => 5000 * d.ln_ratings_count)
        .on('start', function repeat() {
            d3.active(this)
                .attr('x', (d) => xScale(d.average_rating))
                .attr('y', (d) => yScale(d.ln_ratings_count) - smallbookH)
                .attr('width', smallbookW)
                .attr('height', smallbookH)
                .select('img')
                .attr('width', smallbookW)
                .attr('height', smallbookH);
        });


});
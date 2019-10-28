// load data
d3.queue()
    .defer(d3.json, 'data/books.json')
    .defer(d3.csv, 'data/authors.csv')
    .await(draw);


function draw(err, books, authors) {
    if (err) console.log('Error loading data!');

    // TOP LEVEL
    let top = 100;
    let width = 1000;
    let container = d3.select('#draw');
    let cover_base = 'http://covers.openlibrary.org/b/isbn/',
        book_base = 'https://www.goodreads.com/book/show/';

    // process data
    authors.map(d => {
        d.books = d.books.split(/\W/g).filter(e => e != "").map(e => +e);
    });
    authors = authors.sort((a, b) => b.books.length - a.books.length).filter((d, i) => i < top);
    let book_range = [].concat.apply([], authors.map(d => d.books)).map(d => books[d]['# num_pages']);

    // parameters
    let row_height = 15;
    let margin = { top: 0, left: 0, bottom: 15, right: 0 };
    let height = row_height * (authors.length / 2) + margin.top + margin.bottom;
    let column_init_padding = 150,
        column_width = (width - margin.left - margin.right - column_init_padding * 2) / 2,
        column_padding = 0,
        row_padding = 3;
    let book_width = column_width / d3.max(authors.map(d => d.books.length));
    let page_range = d3.extent(book_range);
    let f = d3.format('.0f'),
        comma = d3.format(',');
    let legend_cell_width = 62,
        legend_cell_height = 10,
        legend_width = 380,
        legend_height = 50,
        legend_margin = { top: 10, left: 15, bottom: 0, right: 0 };
    let slider_width = 250,
        slider_height = 50,
        slider_min = page_range[0],
        slider_default_min = 100,
        slider_max = page_range[1],
        slider_default_max = 500,
        slider_margin = { top: 10, left: 15, bottom: 0, right: 15 },
        slider_format = d3.format(',');

    // scale and legend
    let rating_scale = d3.scaleThreshold()
        .domain([1, 3, 3.5, 4, 4.5])
        .range(['#c51b7d', '#f1b6da', '#e6f5d0', '#b8e186', '#7fbc41', '#4d9221']);
    let rating_legend = d3.legendColor().scale(rating_scale).orient('horizontal')
        .shapeWidth(legend_cell_width).shapeHeight(legend_cell_height).shapePadding(legend_cell_width)
        .labels(d3.legendHelpers.thresholdLabels).labelDelimiter('-').labelAlign('start').labelOffset(20);

    // draw
    // tooltip
    let tooltip = d3.select('#tooltip').style('opacity', 0);
    // svg
    let svg = container.append('svg').attr('width', width).attr('height', height);

    let g = svg.append('g')
        .attr('width', width - margin.left - margin.right)
        .attr('height', height - margin.top - margin.bottom)
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    let rows = g.append('g')
        .selectAll('g')
        .data(authors)
        .enter()
        .append('g')
        .attr('width', column_init_padding + column_width)
        .attr('height', row_height)
        .attr('transform', (d, i) => {
            return 'translate(' + (Math.floor(i / 50) * (column_init_padding + column_width + 10)) + ',' + row_height * ((i % 50) + 1) + ')';
        });

    let names = rows.append('text')
        .text(d => d.author)
        .attr('class', 'names')
        .attr('x', 0)
        .attr('y', row_height / 2)
        .style('fill', '#000')
        .style('stroke', 'none');

    let covers = rows.append('g')
        .selectAll('rect')
        .data(d => d.books)
        .enter()
        .append('rect')
        .attr('class', 'books')
        .sort((a, b) => books[a].average_rating - books[b].average_rating)
        .attr('x', (e, i) => column_init_padding + i * (book_width + column_padding))
        .attr('y', 0)
        .attr('width', book_width)
        .attr('height', row_height - row_padding)
        .style('fill', '#ddd');

    // slider
    let slider_g = d3.select('#slider')
        .append('svg')
        .attr('width', slider_width + slider_margin.left + slider_margin.right)
        .attr('height', slider_height + slider_margin.top + slider_margin.bottom)
        .attr('transform', 'translate(0,' + slider_height / 3 + ')')
        .append('g')
        .attr('width', slider_width)
        .attr('height', slider_height)
        .attr('transform', 'translate(' + slider_margin.left + ',' + slider_margin.top + ')');

    let slider = d3.sliderBottom()
        .min(slider_min)
        .max(slider_max)
        .width(slider_width)
        .tickFormat(slider_format)
        .step(1)
        .default([slider_default_min, slider_default_max])
        .fill('#2196f3')
        .ticks(5)
        .on('onchange', d => {
            d3.select('#slider_range').html(d.map(e => slider_format(e)).join('-'));
            covers.style('fill', '#ddd')
                .filter(e => {
                    return books[e]['# num_pages'] >= d[0] && books[e]['# num_pages'] <= d[1];
                })
                .style('fill', e => rating_scale(books[e].average_rating));
        });

    // init slider
    d3.select('#slider_range').html(slider.value().map(e => slider_format(e)).join('-'));
    covers.filter(e => books[e]['# num_pages'] >= slider_default_min && books[e]['# num_pages'] <= slider_default_max)
        .style('fill', e => rating_scale(books[e].average_rating));

    // call slider
    slider_g.call(slider);

    // legend
    d3.select('#legend')
        .append('svg')
        .attr('width', legend_width)
        .attr('height', legend_height)
        .attr('transform', 'translate(0,' + legend_height / 2 + ')')
        .append('g')
        .attr('width', legend_width - legend_margin.left - legend_margin.right)
        .attr('height', legend_height - legend_margin.top - legend_margin.bottom)
        .attr("transform", "translate(" + legend_margin.left + "," + legend_margin.top + ")")
        .call(rating_legend);

    // mouseover books
    covers.on('mouseover', d => {
            // get image
            tooltip.select('#tooltip_img').attr('src', cover_base + books[d].isbn + '-M.jpg');
            // get name and text
            tooltip.select('#book_name').html(books[d].title);
            tooltip.select('#book_text').html('<p><span>Avg. Rating:</span> ' + books[d].average_rating + '</p>' +
                '<p> <span># of Ratings:</span> ' + comma(books[d].ratings_count) + '</p>' +
                '<p> <span># of Pages:</span> ' + slider_format(books[d]['# num_pages']) + '</p>' +
                '<p> <span>Language:</span> ' + books[d].language_code + '</p>')

            tooltip.style('left', (d3.event.pageX + 10) + 'px')
                .style('top', (d3.event.pageY - 10) + 'px')
                .transition()
                .duration(500)
                .style('opacity', 1)
                .style('display', 'block');
        })
        .on('mouseout', d => {
            tooltip.transition().duration(700).style('opacity', 0).style('display', 'none');
        })
        .on('click', d => {
            window.open(book_base + d);
        });

    // finish vis
    d3.select('#placeholder').style('display', 'none');
    d3.select('#content').style('display', null);

}
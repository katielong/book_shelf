// load data
d3.queue()
    .defer(d3.json, 'data/books.json')
    .defer(d3.csv, 'data/authors.csv')
    .await(draw);


function draw(err, books, authors) {
    if (err) console.log('Error loading data!');

    authors.map(d => {
        d.books = d.books.split(/\W/g).filter(e => e != "").map(e => +e);
    });

    let container = d3.select('#draw');

    let row_height = 20;
    let margin = { top: 0, left: 20, bottom: 20, right: 0 };
    let width = 900 //container.node().clientWidth;
    let height = row_height * authors.length + margin.top + margin.bottom;

    let book_width = 600 / d3.max(authors.map(d => d.books.length));
    let column_init_padding = 150,
        column_padding = 0,
        row_padding = 5;
    let titles = ['Author', 'Min. Avg. Rating', 'Max Avg. Rating', 'Avg. Rating Count', 'Covers'];

    let f = d3.format('.0f'),
        comma = d3.format(',');
    let rating_scale = d3.scaleLinear()
        .domain([1, 1.5, 2, 2.5, 3, 3.3, 3.6, 4, 4.5, 4.8])
        .range(['#40004b', '#762a83', '#9970ab', '#c2a5cf', '#e7d4e8', '#f7f7f7', '#d9f0d3', '#a6dba0', '#5aae61', '#1b7837', '#00441b']);

    let slider_width = 300,
        slider_height = 50,
        slider_min = 0,
        slider_default_min = 4,
        slider_max = 5,
        slider_margin = { top: 10, left: 15, bottom: 0, right: 15 },
        slider_format = d3.format('.2f');

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
        .sort((a, b) => b.books.length - a.books.length)
        .attr('width', width - margin.left - margin.right)
        .attr('height', row_height)
        .attr('transform', (d, i) => 'translate(0,' + row_height * (i + 1) + ')');

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
        .style('fill', d => rating_scale(books[d].average_rating));

    // slider
    let slider_g = d3.select('#slider')
        .append('svg')
        .attr('width', slider_width + slider_margin.left + slider_margin.right)
        .attr('height', slider_height + slider_margin.top + slider_margin.bottom)
        .attr('transform', 'translate(0,' + slider_height / 2.5 + ')')
        .append('g')
        .attr('width', slider_width)
        .attr('height', slider_height)
        .attr('transform', 'translate(' + slider_margin.left + ',' + slider_margin.top + ')');

    let slider = d3.sliderBottom()
        .min(slider_min)
        .max(slider_max)
        .width(slider_width)
        .tickFormat(slider_format)
        .default([slider_default_min, slider_max])
        .fill('#2196f3')
        .ticks(10)
        .on('onchange', d => {
            d3.select('#slider_range').html(d.map(e => slider_format(e)).join('-'));
            covers.style('stroke', 'none')
                .filter(e => {
                    return books[e].average_rating >= d[0] && books[e].average_rating <= d[1];
                }).style('stroke', '#000');
        });
    // init slider
    d3.select('#slider_range').html(slider.value().map(e => slider_format(e)).join('-'));
    covers.filter(e => {
        return books[e].average_rating >= slider_default_min && books[e].average_rating <= slider_max;
    }).style('stroke', '#000');
    // call slider
    slider_g.call(slider);

    // mouseover books
    covers.on('mouseover', d => {
            // get image
            tooltip.select('#tooltipImg').attr('src', 'http://covers.openlibrary.org/b/isbn/' + books[d].isbn + '-M.jpg');
            // get name and text
            tooltip.select('#bName').html(books[d].title);
            tooltip.select('#bText').html('<p>Avg. Rating: ' + books[d].average_rating + '</p><p> # of Ratings: ' + comma(books[d].ratings_count) + '</p>')

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
            window.open('https://www.goodreads.com/book/show/' + d);
        });
    // finish vis
    d3.select('#placeholder').style('display', 'none');
    d3.select('#content').style('display', null);

}
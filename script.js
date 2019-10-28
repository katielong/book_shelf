// load data
d3.queue()
    .defer(d3.json, 'data/books.json')
    .defer(d3.csv, 'data/authors.csv')
    .await(draw);


function draw(err, books, authors) {
    if (err) console.log('Error loading data!');

    // process data
    authors.map(d => {
        d.books = d.books.split(/\W/g).filter(e => e != "").map(e => +e);
    });

    // top 50 for now
    let top = 50;
    authors = authors.sort((a, b) => b.books.length - a.books.length).filter((d, i) => i < 50);

    // parameters
    let container = d3.select('#draw');
    let width = 900;
    let row_height = 15;
    let margin = { top: 0, left: 0, bottom: 15, right: 0 };
    let height = row_height * authors.length + margin.top + margin.bottom;

    let column_init_padding = 150,
        column_width = width - margin.left - margin.right - column_init_padding,
        column_padding = 0,
        row_padding = 3;
    let book_width = column_width / d3.max(authors.map(d => d.books.length));
    let page_range = d3.extent(Object.values(books).map(d => d['# num_pages']));
    let f = d3.format('.0f'),
        comma = d3.format(',');
    let rating_scale = d3.scaleThreshold()
        .domain([1, 3, 3.5, 4, 4.5])
        .range(['#c51b7d', '#f1b6da', '#e6f5d0', '#b8e186', '#7fbc41', '#4d9221']);
    let chord_size = 300,
        chord_transform = { left: column_width * 3 / 4, top: height / 3 };
    let slider_width = 300,
        slider_height = 50,
        slider_min = page_range[0],
        slider_default_min = 100,
        slider_max = page_range[1],
        slider_default_max = 500,
        slider_margin = { top: 10, left: 15, bottom: 0, right: 15 },
        slider_format = d3.format(',');

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
        .attr('width', width - margin.left - margin.right)
        .attr('height', row_height)
        .attr('transform', (d, i) => 'translate(0,' + row_height * (i + 1) + ')');

    let names = rows.append('text')
        .text(d => d.author)
        .attr('class', 'names')
        .attr('x', 0)
        .attr('y', row_height / 2)
        .style('fill', '#000')
        .style('stroke', 'none')
        .on('click', show_coauthors);

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
    covers.filter(e => {
            return books[e]['# num_pages'] >= slider_default_min && books[e]['# num_pages'] <= slider_default_max;
        })
        .style('fill', e => rating_scale(books[e].average_rating));

    // call slider
    slider_g.call(slider);

    // mouseover books
    covers.on('mouseover', d => {
            // get image
            tooltip.select('#tooltipImg').attr('src', 'http://covers.openlibrary.org/b/isbn/' + books[d].isbn + '-M.jpg');
            // get name and text
            tooltip.select('#bName').html(books[d].title);
            tooltip.select('#bText').html('<p>Avg. Rating: ' + books[d].average_rating + '</p>' +
                '<p> # of Ratings: ' + comma(books[d].ratings_count) + '</p>' +
                '<p> # of Pages: ' + slider_format(books[d]['# num_pages']) + '</p>' +
                '<p> Language: ' + books[d].language_code + '</p>')

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

    // show functions
    function show_coauthors(d) {
        let author = d.author;
        let author_info = authors.filter(d => d.author == author).sort((a, b) => b.books.length - a.books.length);
        let coauthors_count = _.countBy([].concat.apply([], author_info[0].books.map(d => books[d].co_authors)), d => d);
        let coauthors = [],
            coauthors_name = Object.keys(coauthors_count);
        coauthors_name.forEach(n => {
            if (n == author) {
                coauthors_count[author] = author_info[0].books.filter(d => books[d].co_authors.length == 1).length;
                coauthors.push(Object.keys(coauthors_count).map(d => d == author ? coauthors_count[author] : 0));
            } else {
                coauthors.push(Object.keys(coauthors_count).map(d => d == n ? coauthors_count[n] : 0));
            }
        });

        let inner_r = chord_size * 0.8 / 2,
            outer_r = chord_size / 2;
        let chord = d3.chord().padAngle(0.03),
            ribbon = d3.ribbon().radius(inner_r);
        let arc = d3.arc()
            .innerRadius(inner_r)
            .outerRadius(outer_r);
        let color = d3.scaleOrdinal(d3.schemeCategory20).domain(d3.range(20));

        // chord diagram to show co-authorship
        d3.select('#chord').remove();
        let chord_g = g.append('g')
            .attr('id', 'chord')
            .attr('width', chord_size)
            .attr('height', chord_size)
            .attr('transform', 'translate(' + (chord_transform.left + chord_size / 2) + ',' + (chord_transform.top + chord_size / 2) + ')')
            .datum(chord(coauthors));
        let groups = chord_g.append('g')
            .attr('class', 'group')
            .selectAll('g')
            .data(chords => chords.groups)
            .enter()
            .append('g');
        let path = groups.append('path')
            .style('fill', d => color(d.index))
            .attr('d', arc)
            .attr('class', d => 'group' + d.index);

        groups.append("g")
            .append("text")
            .attr("class", "label")
            .text(function(d, i) {
                return coauthors_name[i];
            })
            .style('fill', '#000')
            .attr("transform", function(d) {
                var angle = d.startAngle + (d.endAngle - d.startAngle) / 2 - Math.PI / 2,
                    distance = outer_r + 25;
                if (angle <= Math.PI / 2 & angle >= -Math.PI / 2) {
                    return "rotate(" + angle * 180 / Math.PI + ") translate (" + (distance) + ",0)";
                } else {
                    return "rotate(" + (angle - Math.PI) * 180 / Math.PI + ") translate (-" + (distance + 50) + ",0)";
                }
            });
    }

    // finish vis
    d3.select('#placeholder').style('display', 'none');
    d3.select('#content').style('display', null);

}
angular.module('ir-matrix-cooc')
    .controller('coocController', function ($scope, $timeout, $http, $translate, data) {
    	

    	$scope.logSwitch = false;
        $scope.datetype = false;

      
        $scope.paginationSize = 10;
        $scope.paginationSize2 = 10;
        $scope.setPaginationSize = function (s) {
            $scope.paginationSize = s;
        };
        $scope.setPaginationSize2 = function (s) {
            $scope.paginationSize2 = s;
        };
        window.setPaginationSize = $scope.setPaginationSize;
        window.setPaginationSize2 = $scope.setPaginationSize2;

        $scope.statistic = {
            files: [],
            resultLists : [],
            safe : []
        };
        $scope.parseFloat = parseFloat;

    	var showFeature = {'Konfiguration' : false};
        $scope.show = function (id, write) {
            if (typeof showFeature[id] === 'undefined') {
                showFeature[id] = true;
            }
            if (typeof write !== undefined && write) {
                showFeature[id] = !showFeature[id];
            }
            return showFeature[id];
        };
        $scope.words = "";
        $scope.getWords = function () {
            return $scope.words.split(",").map(function (w) {return w.trim()}).filter(function (w) {return w !== ""});
        };
        $scope.corpora = [];
    //console.log(data.corpora);
        $scope.genres = data.genres;
        $scope.languages = data.languages;
        $scope.minYearScale = data.minYear;
        $scope.maxYearScale = data.maxYear;
        $scope.minYear = data.minYear;
        $scope.maxYear = 0;
        $timeout(function() {$scope.maxYear = data.maxYear}, 10);
        $scope.$watch('minYear', function (y) {
            if (y > $scope.maxYear)
                $scope.maxYear = y;
        });
        $scope.$watch('maxYear', function (y) {
            if (y < $scope.minYear)
                $scope.minYear = y;
        });

        $scope.$watch('corpora', function (y) { /*console.log(y.length);*/        });

        $scope.sel = {languages:[],genres:[]};

        $scope.validation = function () {
            if ($scope.corpora.length < 1) {
                return "Bitte mindestens 1 Korpora auswählen!";
            } else if ($scope.getWords().length === 0) {
                return 'Bitte mindestens 1 Wort zum Vergleichen eingeben!';
            } else {
                return '';
            }

        };
        $scope.minlinksig = 0;
        $scope.$watch('minlinksig', function(y){ /*console.log('#');*/ });

        

        $scope.submit = function () {
            var payload = {
                words : $scope.getWords(),
                corpora : $scope.corpora.filter(function (c) {
                    var filter = true;
                    //if (s === c.name) filter = true;
                    
                    return filter;
                }),
                minYear: $scope.minYear,
                maxYear: $scope.maxYear
            };
            //console.log(payload);
            $http({
                method: 'post',
                url: '/api/cooc',
                timeout: 9999999999,
                data: payload
            }).success(function (data) {
                console.log('success!');
                //console.log(data);
                showFeature.Visualisierung = false;
                $scope.draw(data);
            }).error(function (data, status, header) {
                console.log('error retrieving wordfrequencies!');
            });
        };


 


        var svgcounter = 0; //counts active svg

        $scope.draw = function (xdata) { /*console.log(xdata);*/

            $scope.statistic.safe = [];
            $scope.statistic.safe['normal'] = [];
            $scope.statistic.safe['corporas'] = [];
        	var startword = "";
        	var wordset = [];
        	var nodes = [];
        	var links = [];
            var corporaview=[];
            var linksigmin = 0;
            var linksigmax = 0;
            var statcorp = [];

        	for(d in xdata){

        		if(startword == ""){startword = xdata[d].word;}

        		if(  xdata[d].pairs.length >0 ){
        			var pairs = xdata[d].pairs;
        			for(p in pairs){
        				if(pairs[p].word1 != undefined && pairs[p].word1 != "" && pairs[p].word2 != undefined && pairs[p].word1 != "" ) {
        					var w1id=-1;
	        				var w2id=-1;
	        				if(  wordset.indexOf(pairs[p].word1) == -1){
	        					w1id = wordset.length;
	        					wordset[wordset.length] = pairs[p].word1;
	        					if(pairs[p].word1 === startword){
	        						var node1 = {"name":""+pairs[p].word1+"","group":1};
	        					}
	        					else{
	        						var node1 = {"name":""+pairs[p].word1+"","group":3};	
	        					}
	        					nodes.push(node1);
	        				}
	        				else{
	        					w1id = wordset.indexOf(pairs[p].word1);
	        				}

	        				if( wordset.indexOf(pairs[p].word2) == -1){
	        					w2id = wordset.length;
	        					wordset[wordset.length] = pairs[p].word2;
								var node2 = {"name":""+pairs[p].word2+"","group":4};
	        					nodes.push(node2);
	        				}
	        				else{
	        					w2id = wordset.indexOf(pairs[p].word2);
	        				}
	        				
	        				var linksweight = 0;
	        				if(pairs[p].significance != null){linksweight=pairs[p].significance;}
	        				var link = {"source":w1id,"target":w2id,"value":linksweight};
	        				if(linksigmax<(linksweight/2)){linksigmax = (linksweight/2)+1;}
	        				
	        				links.push(link);
                            var l = {"source":pairs[p].word1,"target":pairs[p].word2,"value":pairs[p].significance};
                            if(pairs[p].word1==startword || pairs[p].word2==startword ){
                                $scope.statistic.safe['normal'].push(l);     
                            }       
        				}
        			}
        		}
                //generate d3 data for each corpora
                var wset = [];
                var currentcorp = xdata[d].corpus.name;


                if(  xdata[d].pairs.length >0 ){

                    var pairs = xdata[d].pairs;
                    
                    for(p in pairs){
                        if(pairs[p].word1 != undefined && pairs[p].word1 != "" && pairs[p].word2 != undefined && pairs[p].word1 != "" ) {
                            var w1id=-1;
                            var w2id=-1;
                            if(  wset.indexOf(pairs[p].word1) == -1){
                                w1id = wset.length;
                                wset[wset.length] = pairs[p].word1;
                                if(pairs[p].word1 === startword){
                                    var node1 = {"name":""+pairs[p].word1+"","group":1};
                                }
                                else{
                                    var node1 = {"name":""+pairs[p].word1+"","group":3};    
                                }
                                
                                if($.isArray(corporaview[currentcorp]) ==false ){
                                    corporaview[currentcorp] = [];
                                    corporaview[currentcorp]['nodes'] = [];
                                    corporaview[currentcorp]['links'] = [];

                                }
                                corporaview[currentcorp]['nodes'].push(node1);
                            }
                            else{
                                w1id = wset.indexOf(pairs[p].word1);
                            }

                            if( wset.indexOf(pairs[p].word2) == -1){
                                w2id = wset.length;
                                wset[wset.length] = pairs[p].word2;
                                var node2 = {"name":""+pairs[p].word2+"","group":4};
                                
                                if($.isArray(corporaview[currentcorp]) ==false ){

                                    corporaview[currentcorp] = [];
                                    corporaview[currentcorp]['nodes'] = [];
                                    corporaview[currentcorp]['links'] = [];
                                }   
                                corporaview[currentcorp]['nodes'].push(node2);
                            }
                            else{
                                w2id = wset.indexOf(pairs[p].word2);
                            }

                            var linksweight = 0;
                            if(pairs[p].significance != null){linksweight=pairs[p].significance;}
                            var link = {"source":w1id,"target":w2id,"value":linksweight};
                            if(linksigmax<(linksweight/2)){linksigmax = (linksweight/2)+1;}
                            
                            corporaview[currentcorp]['links'].push(link);
                        }
                    }                
                }


                //generate data for statistic table
                var cname = "";
                if(  xdata[d].pairs.length >0 ){
                    cname = xdata[d].corpus.name;
                    $scope.statistic.safe[cname] = [];
                     
                    for(p in pairs){
                        if(pairs[p].word1 == '' || pairs[p].word2 == '' || pairs[p].word1 == null || pairs[p].word2 == null  ){continue;}
                        if(pairs[p].word1==xdata[d].word || pairs[p].word2==xdata[d].word ){
                            var l = {"source":pairs[p].word1,"target":pairs[p].word2,"value":pairs[p].significance};
                            $scope.statistic.safe[cname].push(l);
                        } 
                    }
                }
            
                if($scope.statistic.safe['corporas'].indexOf(cname) === -1 && cname !== ''){
                    if($scope.statistic.safe[cname].length >0){
                        $scope.statistic.safe['corporas'].push(cname);    
                    }
                }
        	}

            $scope.statistic.safe['corporas'].push('normal');

            for(e in $scope.statistic.safe){
                if( e.indexOf('corporas') == -1){
                    $scope.statistic.resultLists[e]=$scope.statistic.safe[e];    
                }
            }

            var corpset = [];
            corpset.push('all');
            for(corp in corporaview){
                corpset.push(corp);
            }

            drawsvg(linksigmax,nodes,links,startword,corpset,corporaview,nodes,links,'');
        }


        $scope.updatecorp = function(){
            var y = data.corpora.filter(function(s){ 
                if( ($scope.datetype ==false && s.datetype == 'year') || ($scope.datetype ==true && s.datetype == 'day')  ){
                    if($scope.sel.languages.indexOf(s.language) != -1 ) {
                        //console.log(s);
                        if($scope.sel.genres.indexOf(s.genre) != -1 ) {
                            return s;
                        }      
                    }
                }
            });
            $scope.corpora = y;
        }

        
        function update(word){

       		var words = [];
       		words.push(word);
            var payload = {
                words : words,
                corpora : $scope.corpora.filter(function (c) {
                    var filter = true;
                    
                    return filter;
                }),
                minYear: $scope.minYear,
                maxYear: $scope.maxYear
            };
            //console.log(payload);
            $http({
                method: 'post',
                url: '/api/cooc',
                timeout: 9999999999,
                data: payload
            }).success(function (data) {
                console.log('success!');
                //console.log(data);
                showFeature.Visualisierung = false;
                $scope.draw(data);
            }).error(function (data, status, header) {
                console.log('error retrieving wordfrequencies!');
            });
        }


        function drawsvg(linksigmax, nodes, links,startword,corpset,corporaview,allnodes,alllinks,currentcorpname){

            var margin = {top: 20, right: 200, bottom: 30, left: 50},
                width = 1160 - margin.left - margin.right,
                height = 500 - margin.top - margin.bottom,
                 fill = d3.scale.category10();

            var color = d3.scale.category10();

            var force = d3.layout.force()
                .charge(-60)
                .linkDistance(120)
                .size([width, height]);

                $('#visualization-words').empty();
            var svgdiv = d3.select("#visualization-words").append("div")
                .attr("id",function(){
                    //svgcounter++; 
                    return "svg"+svgcounter+"div";
                })
                .style("background-color","whitesmoke");

            var svgdivheader = d3.select("#svg"+svgcounter+"div");
            var sliderdiv = $('<div id="sliderdiv" ></div>').appendTo(svgdivheader);

            $('<span/>').text(currentcorpname).appendTo(svgdivheader);

            $('<div/>').text($translate.instant('COOC_MIN_SIG'))
                .appendTo(sliderdiv)
                .css("float","left")
                .css("margin-right","5px");
             
            $('<div id="sliderlabel" />')
                .text(0)
                .css("float","left")
                .appendTo(sliderdiv);


            var dropdown = $('<select id="corpselect" />');
            for(co in corpset){
                dropdown.append(' <option value="'+co+'">'+corpset[co]+'</option>');
            }
            dropdown.appendTo(sliderdiv);

            var slider = $(' <input ng-model="svgcounter" type="range" min="0" value="0" class="slider"></input>')
             .attr("max",linksigmax)
             .attr("id","slider-range").css("width","150px").css("float","left")
             .change(function(e){
                $('#sliderlabel').text($(this).val());
                $scope.minlinksig = $(this).val();
               
                svg.selectAll("line.link")
                    .style("stroke-width", function(d) { 
                        var linksig =  (d.value/2)-$scope.minlinksig;
                        if(linksig < 0) {return 0;}
                        else{return (d.value/2);}
                    })
            })
            .appendTo(sliderdiv);

            var svg = d3.select("#svg"+svgcounter+"div").append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .attr("id",function(){return "svg"+svgcounter+"content";})
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


            d3.json("", function(error ) {
              if (error) throw error;


                var force = self.force = d3.layout.force()
                        .nodes(nodes)
                        .links(links)
                        .gravity(.05)
                        .distance(height/2)
                        .charge(-30)
                        .size([width, height])
                        .start();

                var link = svg.selectAll("line.link")
                    .data(links)
                    .enter().append("svg:line")
                    .style("stroke-width", function(d) { return d.value/2/*Math.sqrt(d.value)*/; })
                    .style("stroke",function(d){ if(d.source.name === startword){return "blue"}else{ return "gray";}})
                    .attr("class", "link")
                    .attr("x1", function(d) { return d.source.x; })
                    .attr("y1", function(d) { return d.source.y; })
                    .attr("x2", function(d) { return d.target.x; })
                    .attr("y2", function(d) { return d.target.y; });

                var node_drag = d3.behavior.drag()
                    .on("dragstart", dragstart)
                    .on("drag", dragmove)
                    .on("dragend", dragend);

                function dragstart(d, i) {
                    force.stop() // stops the force auto positioning before you start dragging
                }

                function dragmove(d, i) {
                    d.px += d3.event.dx;
                    d.py += d3.event.dy;
                    d.x += d3.event.dx;
                    d.y += d3.event.dy; 
                    tick(); // this is the key to make it work together with updating both px,py,x,y on d !
                }

                function dragend(d, i) {
                    d.fixed = true;
                    tick();
                    force.resume();
                }

                var linkedByIndex = {};
                links.forEach(function(d) {
                    linkedByIndex[d.source.index + "," + d.target.index] = 1;
                    linkedByIndex[d.target.index + "," + d.source.index] = 1;
                });

                function neighboring(a, b){ 
                    if(a.index===b.index) return 1;
                  return linkedByIndex[b.index + "," + a.index]; 
                }
                function neighboringlinks(a,b){ 
                    return (a.index==b.source.index) ? (a.index==b.source.index) : a.index==b.target.index;
                }

                var node = svg.selectAll("g.node")
                    .data(nodes)
                      .enter().append("svg:g")
                        .attr("class", "node")     
                        .call(node_drag)
                        .on("mouseover", fade(.1)).on("mouseout", fade(1));

                node.append("circle")
                    .attr("class", "node")
                    .attr("r", 5)
                    .style("fill", function(d) { return fill(d.group); })
                ;

                node.append("svg:title")
                    .text(function(d) { return d.name; });

                node.append("svg:text")
                    .attr("class", "nodetext text")
                    .attr("dx", 12)
                    .attr("dy", ".35em")
                    .style("font-size","15px")
                    .style("fill",function(d) { return fill(d.group); })
                    .style("cursor","pointer")
                    .text(function(d) { return d.name })
                    .on({
                      "mouseover": function() { /* do stuff */ },
                      "mouseout":  function() { /* do stuff */ }, 
                      "click":  function(d) { update(d.name) }, 
                    });


                force.on("tick", tick);

                $('#corpselect').change(function(){
                    
                    if($(this).val() === 0){
                        drawsvg(linksigmax, allnodes, alllinks,startword,corpset,corporaview,allnodes,alllinks,'');
                    }
                    else{
                        drawsvg(linksigmax, corporaview[corpset[$(this).val()]]['nodes'], corporaview[corpset[$(this).val()]]['links'],startword,corpset,corporaview,allnodes,alllinks,corpset[$(this).val()]);   
                    }
                })

                function tick() {
                  link.attr("x1", function(d) { return d.source.x; })
                      .attr("y1", function(d) { return d.source.y; })
                      .attr("x2", function(d) { return d.target.x; })
                      .attr("y2", function(d) { return d.target.y; });

                  node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
                };

                function fade(opacity) { 
                    return function(d, i){
                        node.style("opacity", function(o) {
                            if(opacity==1) return opacity;
                            return neighboring(d, o) ? 1 : opacity;
                        });
                        link.style("opacity", function(o) {
                            if(opacity==1) return opacity;
                            return neighboringlinks(d,o) ?   1:opacity;
                        });
                    }
                }
            });

            showFeature['Statistik'] = false;

            $scope.selectCooclist = function (name) {
                $scope.sel.wordList = name;
            };
            $scope.selectCooclist2 = function (name) {
                $scope.sel.wordList2 = name;
            };

        }
    });


 
angular.module('ir-matrix-cooc')
    .controller('korporaController', function ($scope, $timeout, $http, data, jobManager, matrixVisualization) {
        // debug
        $scope.alert = window.alert.bind(window);

        // inital controller data
        $scope.$watch(jobManager.jobs, function (newValue) {
            $scope.jobs = newValue;
        }, true);

        console.log(data);
        $scope.corpora = data.corpora.map(function(c) {
            c['language'] = window.languages.get(c.name.substring(0,3));
            return c;
        });

        $scope.languages = $scope.corpora.reduce(function (prev, curr, i) {
            if (i == 0) {
                return prev.concat([curr.language]);
            } else if (prev.indexOf(curr.language) == -1) {
                return prev.concat([curr.language]);
            } else {
                return prev;
            }
        }, []);

        $scope.metrics = [
            {key: 1, title: "Cosinus - basierend auf Rang"},
            {key: 2, title: "Cosinus - basierend auf Freq."},
            {key: 3, title: "Cosinus - basierend auf Logarithmus d. Freq."},
            {key: 4, title: "Anteil unterschiedlicher Wörter"},
            {key: 5, title: "Kendalls Tau - basierend auf Rang"},
            {key: 6, title: "Mass nach UQ - basierend auf Rang"},
            {key: 7, title: "Cosinus - basierend auf Rang"},
            {key: 8, title: "Cosinus - basierend auf Freq."},
            {key: 9, title: "Cosinus - basierend auf Logarithmus d. Freq."}];

        $scope.metricgroup = function (x) {
            return ( x.key < 5 ? "Versch." : "Gleiche" ) + " Listenlängen";
        };

        $scope.statistic = {
            files: [],
            resultLists : []
        };

        $scope.requestName = "";
        $scope.wordCount = 10000;
        $scope.heatMapColors = matrixVisualization.heatMap.colors();
        $scope.sel = {
            corpora: [],
            metric: 3,
            colors: 'Standard',
            sorting: 'sortOrder'
        };
        $scope.sortings = matrixVisualization.sortings;

        $scope.maxClusterDiameter = matrixVisualization.maxClusterDiameter();
        $scope.limit = 125;

        // feature display toggle
        var showFeature = {
            'Konfiguration' : false,
            'Jobauswahl' : false
        };
        $scope.show = function (id, write) {
            if (typeof showFeature[id] === 'undefined') {
                showFeature[id] = true;
            }
            if (typeof write !== undefined && write) {
                showFeature[id] = !showFeature[id];
            }
            return showFeature[id];
        };

        // validation function for form
        $scope.validation = function () {
            if ($scope.sel.corpora.length < 2) {
                return "Bitte mindestens 2 Korpora auswählen!";
            } else {
                return '';
            }

        };

        // Submit Job Request and queue up jobs
        $scope.submit = function () {
            var job = {
                wordCount: $scope.wordCount,
                corpora: $scope.corpora.filter(function (c) {
                    var filter = false;
                    $scope.sel.corpora.forEach(function (s) {
                        if (s === c.name) filter = true;
                    });
                    return filter;
                }),
                metric: $scope.sel.metric,
                requestName: $scope.requestName === "" ? "Unbenannt" : $scope.requestName
            };
            if (!$scope.validation()) {
                jobManager.issueJob(job).then(function (data) {
                    showFeature.Visualisierung = false;
                    $scope.draw(data);
                    jobManager.currentJob(job);
                });
            }
        };

        $scope.deleteJob = jobManager.deleteJob;
        $scope.currentJob = jobManager.currentJob;
        $scope.resetJobs = function () {
            jobManager.clearJobs();
        };

        $scope.setConfig = function (j) {
            if ($scope.sel.corpora.length === 0) {
                // bugfix
                $timeout(function () {$scope.setConfig(j)}, 100);
            }
            $scope.wordCount = j.wordCount;
            $scope.sel.metric = j.metric;
            $scope.requestName = j.requestName + "'";
            $scope.limit = Math.pow(2,32) - 1;
            $scope.sel.corpora = j.corpora;
            $timeout(function () {$scope.limit = 125}, 50);
        };

        $scope.selectJob = function (j) {
            jobManager.issueJob(j).then(function (data) {
                showFeature.Visualisierung = false;
                $scope.draw(data);
                jobManager.currentJob(j);
                jobManager.markJob(j, true);
            });
        };

        $scope.$watch('sel.colors', function (name) {
            matrixVisualization.heatMap.setMap.call(matrixVisualization.heatMap, name);
            if (jobManager.data())
                $scope.draw(jobManager.data());
        });

        $scope.$watch('sel.sorting', function (name) {
            matrixVisualization.setSorting(name);
            if (jobManager.data())
                $scope.draw(jobManager.data());
        });

        $scope.$watch(matrixVisualization.maxClusterDiameter, function (x) {
            $scope.maxClusterDiameter = x;
        }, true);

        $scope.$watch('maxClusterDiameter', function (x) {
            if (jobManager.data())
                $scope.draw(jobManager.data());
        }, true);

        $scope.$watch(matrixVisualization.currentPair, function (x) {
            if (x) {
                var currentRequest = jobManager.jobs().filter(function (j) {
                    return j.requestId === jobManager.currentJob()
                })[0];
                var regex = currentRequest.wordCount + "_" + currentRequest.metric + "_" + "(" + x[0] + "_" + x[1] + "|"
                    + x[1] + "_" + x[0] + "){1}\\.txt";
                regex = ["list[1,2]{1}_" + regex, "both_lists_" + regex];
                showFeature['Statistik'] = true;
                $http({
                    method: 'post',
                    url: '/api/korpora/resultlists',
                    timeout: 9999999999,
                    data: {requests : [{regex: regex[0], listType: 'oneList'}, {regex: regex[1], listType: 'bothLists'}]}
                }).success(function (data) {
                    if (typeof data.resultlists !== 'undefined') {
                        //data.resultlists.bothLists = data.resultlists.bothLists.map(function (r) {
                        //    var x = [r,r];
                        //    x[0].list = x[0].list.slice().filter(function (f) {return parseFloat(f.logRatioNormalized) >= 0});
                        //    x[1].list = x[1].list.filter(function (f) {return parseFloat(f.logRatioNormalized) < 0});
                        //    return x;
                        //}).reduce(function (l,r) {return l.concat(r)}, []);
                        $scope.statistic.resultLists = data.resultlists;
                        console.log(data.resultlists);
                        showFeature['Statistik'] = false;
                    }
                });
            }
        }, true);

        // Draw Visualization
        $scope.draw = function (data) {matrixVisualization.draw(data, $scope.maxClusterDiameter)};

        // Draw current job on controller instantiation
        jobManager.jobs().forEach(function (j) {
            if (jobManager.currentJob() === j.requestId){
                showFeature.Visualisierung = true;
                $scope.selectJob(j);
            }
        });



    });


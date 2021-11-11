import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { debounceTime, tap, switchMap, finalize, startWith } from 'rxjs/operators';
import { faSearch, faBars, faStarOfLife, } from '@fortawesome/free-solid-svg-icons';
import * as Highcharts from 'highcharts';
import { Loader } from '@googlemaps/js-api-loader';

declare var require: any;
let Boost = require('highcharts/modules/boost');
let noData = require('highcharts/modules/no-data-to-display');
let More = require('highcharts/highcharts-more');
let wind = require('highcharts/modules/windbarb');
let histogram = require('highcharts/modules/histogram-bellcurve');

Boost(Highcharts);
noData(Highcharts);
More(Highcharts);
noData(Highcharts);
wind(Highcharts);
histogram(Highcharts);

@Component({
  selector: 'app-search-card',
  templateUrl: './search-card.component.html',
  styleUrls: ['./search-card.component.css']
})

export class SearchCardComponent implements OnInit {
  isLeftVisible = true;
  Highcharts: typeof Highcharts = Highcharts; // required
  chartConstructor: string = 'chart';
  updateFlag: boolean = false; // optional boolean
  oneToOneFlag: boolean = true; // optional boolean, defaults to false
  runOutsideAngular: boolean = false; // optional boolean, defaults to false
  chartOptions: Highcharts.Options;
  chartOptions2: Highcharts.Options;
  searchCitiesCtrl = new FormControl();
  filteredCities: any;
  isLoading = false;
  faSearch = faSearch;
  faBars = faBars;
  faStar = faStarOfLife;
  isAutoDetect;
  activeTab = "resultsTab";
  locationStr: string = "";
  location: any;

  intervals: any[];
  activeResultsTab: string = "day";
  initializedData: any = undefined;
  initializedDataHourly: any;
  currentDateData: any;
  twitterText: string = "";
  isFave: boolean = false;

  constructor(
    private http: HttpClient
  ) { }

  ngOnInit() {
    this.searchCitiesCtrl.valueChanges
      .pipe(
        debounceTime(500),
        tap(() => {
          this.filteredCities = [];
          this.isLoading = true;
        }),
        switchMap(value => this.http.get("https://csci571-hw8-329706.wl.r.appspot.com/autocomplete?inputCity=" + value)
          .pipe(
            finalize(() => {
              this.isLoading = false
            }),
          )
        )
      )
      .subscribe((data: any) => {
        if (data.error) {
          this.filteredCities = [];
        } else {
          this.filteredCities = data;
        }
      });
  }

  scrollTop() {
    window.scrollTo(0, 0);
  }

  async onSearch() {
    this.initializedData = undefined;
    this.isFave = false;
    let timeoutID;
    this.activeTab = "resultsTab";
    document.getElementById('progressBar').classList.remove("d-none");

    timeoutID = setInterval(function increaseWidth() {
      const width = parseInt(document.getElementById('progressInner').style.width);
      if (width < 90) {
        document.getElementById('progressInner').style.width = (width + 10) + "%";
      }
    }, 50);

    if (this.isAutoDetect) {
      const data: any = await this.http.get("https://ipinfo.io/json?token=de7857647d098b").toPromise();
      this.initializedData = data;
      if (data.loc) {
        this.location = await data.loc;
        this.locationStr = data.city + "," + data.region;
        if(localStorage.getItem(this.locationStr) != null) {
          this.isFave = true;
        }
      }
    }
    else {
      console.log("work on taking input and validation");
    }

    if (this.location) {
      await this.http.get("https://csci571-hw8-329706.wl.r.appspot.com/currentWeather?location=" + this.location).subscribe((data: any) => {
        if (data.error) {
          console.log(data.error);
        } else {
          this.intervals = data?.day?.data?.timelines[0]?.intervals;
          this.initializedDataHourly = data?.current?.data?.timelines[1]?.intervals;
          this.initializedData = this.intervals;

          this.intervals.forEach((interval: any) => {
            interval.dateStr = getFormattedDate(new Date(interval.startTime));
            interval.statusText = weatherMap.get(interval?.values?.weatherCode);
            interval.image = "https://csci571-hw8-329706.wl.r.appspot.com/images/" + interval?.values?.weatherCode + ".svg";
            interval.sunriseTime = formatAMPM(new Date(interval?.values?.sunriseTime));
            interval.sunsetTime = formatAMPM(new Date(interval?.values?.sunsetTime));
          });
        }
        clearInterval(timeoutID);
        document.getElementById('progressBar').classList.add("d-none");

        if (this.initializedData && this.initializedDataHourly) {
          this.displayAreaRange();
          this.displayMeteogram();
        }
      });
    }
  }

  initializeDetails() {
    this.twitterText = `https://twitter.com/intent/tweet?text=` + encodeURIComponent(`The temperature in ` + this.locationStr +
      ` on ` + this.currentDateData.dateStr + ` is ` + this.currentDateData?.values.temperatureApparent + ` °F. The weather conditions are `
      + this.currentDateData?.statusText + ` #CSCI571WeatherSearch`);

    let loader = new Loader({ apiKey: 'AIzaSyASTUacuge5Ih0iR1_fSSBJpGh7L5qgxj0' });

    const locArr = this.location.split(",");

    let center = { lat: parseFloat(locArr[0]), lng: parseFloat(locArr[1]) };
    loader.load().then(() => {
      const map = new google.maps.Map(document.getElementById("map"), {
        center,
        zoom: 11
      });
      new google.maps.Marker({
        position: center,
        map
      });
    });
  }

  displayMeteogram() {

    function Meteogram(json, container, chartOptions2) {
      this.winds = [];
      this.humidity = [];
      this.temperatures = [];
      this.pressures = [];

      // Initialize
      this.json = json;
      this.container = container;
      this.chartOptions2 = chartOptions2;

      // Run
      this.parseYrData();
    }

    /**
     * Draw blocks around wind arrows, below the plot area
     */
    Meteogram.prototype.drawBlocksForWindArrows = function (chart) {
      const xAxis = chart.xAxis[0];
      for (
        let pos = xAxis.min, max = xAxis.max, i = 0;
        pos <= max + 36e5; pos += 36e5,
        i += 1
      ) {
        // Get the X position
        const isLast = pos === max + 36e5,
          x = Math.round(xAxis.toPixels(pos)) + (isLast ? 0.5 : -0.5);

        // Draw the vertical dividers and ticks
        const isLong = this.resolution > 36e5 ?
          pos % this.resolution === 0 :
          i % 2 === 0;

        chart.renderer
          .path([
            'M', x, chart.plotTop + chart.plotHeight + (isLong ? 0 : 28),
            'L', x, chart.plotTop + chart.plotHeight + 32,
            'Z'
          ])
          .attr({
            stroke: chart.options.chart.plotBorderColor,
            'stroke-width': 1
          })
          .add();
      }

      // Center items in block
      chart.get('windbarbs').markerGroup.attr({
        translateX: chart.get('windbarbs').markerGroup.translateX + 4
      });
    };

    /**
     * Build and return the Highcharts options structure
     */
    Meteogram.prototype.getChartOptions = function () {
      return {
        chart: {
          renderTo: this.container,
          marginBottom: 70,
          marginRight: 40,
          marginTop: 50,
          plotBorderWidth: 1,
          height: 410,
          alignTicks: false,
          scrollablePlotArea: {
            minWidth: 720
          }
        },
        title: {
          text: 'Hourly Weather (For Next 5 Days)',
          align: 'center',
          style: {
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis'
          }
        },
        credits: {
          text: 'Forecast',
          position: {
            x: -40
          }
        },
        tooltip: {
          shared: true,
          useHTML: true,
          headerFormat:
            '<small>{point.x:%A, %b %e, %H:%M}</small><br>' +
            '<b>{point.point.symbolName}</b><br>'
        },
        time: {
          timezone: 'America/Los_Angeles'
        },
        xAxis: [
          { // Bottom X axis
            type: 'datetime',
            tickInterval: 2 * 36e5, // two hours
            minorTickInterval: 36e5, // one hour
            tickLength: 0,
            gridLineWidth: 1,
            gridLineColor: 'rgba(128, 128, 128, 0.1)',
            startOnTick: false,
            endOnTick: false,
            minPadding: 0,
            maxPadding: 0,
            offset: 30,
            showLastLabel: true,
            labels: {
              format: '{value:%H}'
            },
            crosshair: true
          },
          { // Top X axis
            linkedTo: 0,
            type: 'datetime',
            tickInterval: 24 * 3600 * 1000,
            labels: {
              format: '{value:<span style="font-size: 12px; font-weight: bold">%a</span> %b %e}',
              align: 'left',
              x: 3,
              y: -5
            },
            opposite: true,
            tickLength: 20,
            gridLineWidth: 1
          }
        ],
        yAxis: [
          { // temperature axis
            title: {
              text: null
            },
            labels: {
              format: '{value}°',
              style: {
                fontSize: '10px',
                color: '#000000'
              },
            },
            gridLineColor: 'rgba(128, 128, 128, 0.1)',
            tickPositions: [0, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 84, 90, 96, 102, 108]
          },
          { // humidity axis
            title: {
              text: null
            },
            labels: {
              enabled: false
            },
            gridLineWidth: 0,
            height: '100%',
            top: '0%'
          },
          { // Air pressure
            allowDecimals: false,
            title: { // Title on top of axis
              text: '   hPa',
              offset: 0,
              align: 'high',
              rotation: 0,
              style: {
                fontSize: '10px',
                color: '#FFA500'
              }
            },
            labels: {
              style: {
                fontSize: '8px',
                color: '#FFA500'
              },

            },
            opposite: true,
            tickInterval: 1,
            showLastLabel: false
          }
        ],
        legend: {
          enabled: false
        },
        plotOptions: {
          series: {
            pointPlacement: 'between'
          }
        },
        series: [
          {
            name: 'Temperature',
            data: this.temperatures,
            type: 'spline',
            marker: {
              enabled: false,
              states: {
                hover: {
                  enabled: true
                }
              }
            },
            tooltip: {
              pointFormat: '<span style="color:{point.color}">\u25CF</span> ' +
                '{series.name}: <b>{point.y}°F</b><br/>'
            },
            zIndex: 1,
            color: '#FF3333',
            negativeColor: '#48AFE8'
          },
          {
            name: 'Humidity',
            color: '#76c1ff',
            data: this.humidity,
            //type: 'column',
            tooltip: {
              pointFormat: '<span style="color:{point.color}">\u25CF</span> ' +
                '{series.name}: <b>{point.y} %</b><br/>'
            },
            type: 'histogram',
            yAxis: 1,
            dataLabels: {
              enabled: true,
              style: {
                fontSize: '0.7em'
              }
            }
          },
          {
            name: 'Air pressure',
            color: '#FFA500',
            data: this.pressures,
            tooltip: {
              valueSuffix: ' hPa',
            },
            dashStyle: 'shortdot',
            yAxis: 2,
            marker: {
              enabled: false
            },
          },
          {
            name: 'Wind',
            type: 'windbarb',
            id: 'windbarbs',
            color: 'red',
            lineWidth: 1.2,
            data: this.winds,
            vectorLength: 8,
            crisp: true,
            tooltip: {
              valueSuffix: ' mph',
            }
          }
        ]
      };
    };

    /**
     * Post-process the chart from the callback function, the second argument
     * Highcharts.Chart.
     */
    Meteogram.prototype.onChartLoad = function (chart) {
      this.drawBlocksForWindArrows(chart);
    };

    /**
     * Create the chart. This function is called async when the data file is loaded
     * and parsed.
     */
    Meteogram.prototype.createChart = function () {
      this.chartOptions2 = this.getChartOptions();
      this.chart = new Highcharts.Chart(this.getChartOptions(), chart => {
        this.onChartLoad(chart);
      });
    };

    Meteogram.prototype.error = function () {
      document.getElementById('loading').innerHTML =
        '<i class="fa fa-frown-o"></i> Failed loading data, please try again later';
    };

    /**
     * Handle the data. This part of the code is not Highcharts specific, but deals
     * with yr.no's specific data format
     */
    Meteogram.prototype.parseYrData = function () {

      let pointStart;

      if (!this.json) {
        return this.error();
      }

      this.json.forEach((node, i) => {
        const x = new Date(node.startTime).getTime(),
          to = x + 36e5;

        this.temperatures.push({
          x,
          y: node.values.temperature,
          to
        });

        this.humidity.push({
          x,
          y: parseInt(node.values.humidity)
        });

        if (i % 2 === 0) {
          this.winds.push({
            x,
            value: node.values.windSpeed,
            direction: node.values.windDirection
          });
        }

        this.pressures.push({
          x,
          //y: (Math.round(node.values.pressureSeaLevel * 4) / 4)
          y: parseInt(node.values.pressureSeaLevel)
        });

        if (i === 0) {
          pointStart = (x + to) / 2;
        }
      });

      //console.log(this.temperatures);
      // Create the chart when the data is loaded
      this.createChart();

    };

    const meteo = new Meteogram(this.initializedDataHourly, "container2", this.chartOptions2);
  }

  displayAreaRange() {
    const weatherArr = this.initializedData.map(interval => {
      const dataPoint = [new Date(interval.startTime).getTime(), interval?.values?.temperatureMin, interval?.values?.temperatureMax];
      return dataPoint;
    });

    this.chartOptions = {
      chart: {
        zoomType: 'x',
        scrollablePlotArea: {
          scrollPositionX: 1
        }
      },
      plotOptions: {
        series: {
          marker: {
            fillColor: '#76c1ff',
            lineWidth: 2,
            lineColor: '#76c1ff',
            radius: 2.5
          }
        }
      },
      title: {
        text: 'Temperature Ranges (Min, Max)'
      },
      tooltip: {
        shared: true,
        valueSuffix: '°F',
        xDateFormat: '%A, %b %e'
      },
      legend: {
        enabled: false
      },
      xAxis: {
        type: 'datetime',
        tickInterval: 86400000
      },
      yAxis: {
        tickInterval: 5
      },
      series: [{
        name: 'Temperatures',
        type: 'arearange',
        data: weatherArr,
        color: {
          linearGradient: {
            x1: 0,
            x2: 0.5,
            y1: 0,
            y2: 0.8
          },
          stops: [
            [0, '#f49922'], // start
            [1, '#d4e1f3'] // end
          ]
        },
      }]
    };
  }

  toggleFave() {
    this.isFave = !this.isFave;
    if(this.isFave) {
      localStorage.setItem(this.locationStr, "");
    }
    else {
      localStorage.removeItem(this.locationStr);
    }
  }

}
const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const getFormattedDate = (date) => {
  return weekday[date.getDay()] + ", " + date.getDate() + " " + months[date.getMonth()] + " " + date.getFullYear();
}

const weatherMap = new Map();
weatherMap.set(4201, 'Heavy Rain');
weatherMap.set(1001, 'Cloudy');
weatherMap.set(4001, 'Rain');
weatherMap.set(4200, 'Light Rain');
weatherMap.set(6201, 'Heavy Freezing Rain');
weatherMap.set(6001, 'Freezing Rain');
weatherMap.set(6200, 'Light Freezing Rain');
weatherMap.set(6000, 'Freezing Drizzle');
weatherMap.set(4000, 'Drizzle');
weatherMap.set(7101, 'Heavy Ice Pellets');
weatherMap.set(7000, 'Ice Pellets');
weatherMap.set(7102, 'Light Ice Pellets');
weatherMap.set(5101, 'Heavy Snow');
weatherMap.set(5000, 'Snow');
weatherMap.set(5100, 'Light Snow');
weatherMap.set(5001, 'Flurries');
weatherMap.set(8000, 'Thunderstorm');
weatherMap.set(2100, 'Light Fog');
weatherMap.set(2000, 'Fog');
weatherMap.set(1102, 'Mostly Cloudy');
weatherMap.set(1101, 'Partly Cloudy');
weatherMap.set(1100, 'Mostly Clear');
weatherMap.set(1000, 'Clear');
weatherMap.set(3000, 'Light Wind');
weatherMap.set(3001, 'Wind');
weatherMap.set(3002, 'Strong Wind');

const formatAMPM = (date: Date) => {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const secs = date.getSeconds();
  let strTime = hours.toString().padStart(2, '0') + ":" + minutes.toString().padStart(2, '0') + ":" + secs.toString().padStart(2, '0');
  return strTime;
}
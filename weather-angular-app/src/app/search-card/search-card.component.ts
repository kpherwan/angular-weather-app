import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { debounceTime, tap, switchMap, finalize, startWith } from 'rxjs/operators';
import { faSearch, faBars, faStarOfLife } from '@fortawesome/free-solid-svg-icons';
import * as Highcharts from 'highcharts';

declare var require: any;
let Boost = require('highcharts/modules/boost');
let noData = require('highcharts/modules/no-data-to-display');
let More = require('highcharts/highcharts-more');

Boost(Highcharts);
noData(Highcharts);
More(Highcharts);
noData(Highcharts);


@Component({
  selector: 'app-search-card',
  templateUrl: './search-card.component.html',
  styleUrls: ['./search-card.component.css']
})

export class SearchCardComponent implements OnInit {
  Highcharts: typeof Highcharts = Highcharts; // required
  chartConstructor: string = 'chart'; 
  updateFlag: boolean = false; // optional boolean
  oneToOneFlag: boolean = true; // optional boolean, defaults to false
  runOutsideAngular: boolean = false; // optional boolean, defaults to false
  chartOptions: Highcharts.Options;
  searchCitiesCtrl = new FormControl();
  filteredCities: any;
  isLoading = false;
  faSearch = faSearch;
  faBars = faBars;
  faStar = faStarOfLife;
  isAutoDetect;
  activeTab = "resultsTab";
  locationStr: string = "";
  intervals: any[];
  activeResultsTab: string = "day";
  initializedData: any;
  initializedDataHourly: any;

  errorMsg: string = "";
  response: any;

  constructor(
    private http: HttpClient
  ) { }

  ngOnInit() {
    this.searchCitiesCtrl.valueChanges
      .pipe(
        debounceTime(500),
        tap(() => {
          this.errorMsg = "";
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
          this.errorMsg = data['Error'];
          this.filteredCities = [];
        } else {
          this.errorMsg = "";
          this.filteredCities = data;
        }
      });
  }

  async onSearch() {
    this.initializedData = undefined;
    let timeoutID;
    document.getElementById('progressBar').classList.remove("d-none");

    timeoutID = setInterval(function increaseWidth() {
      const width = parseInt(document.getElementById('progressInner').style.width);
      if (width < 90) {
        document.getElementById('progressInner').style.width = (width + 10) + "%";
      }
    }, 50);


    let location;
    if (this.isAutoDetect) {
      const data: any = await this.http.get("https://ipinfo.io/json?token=de7857647d098b").toPromise();
      this.initializedData = data;
      if (data.loc) {
        location = await data.loc;
        this.locationStr = data.city + ", " + data.region + ", " + data.country;
      }
    }
    else {
      console.log("work on taking input and validation");
    }

    if (location) {
      this.response = await this.http.get("https://csci571-hw6-327205.wl.r.appspot.com/currentWeather?location=" + location).subscribe((data: any) => {
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
          });
        }
        clearInterval(timeoutID);
        document.getElementById('progressBar').classList.add("d-none");
        document.getElementById('resultContainer').classList.remove("d-none");

        if (this.initializedData && this.initializedDataHourly) {
          this.displayAreaRange();
          //displayMeteoGram();
        }
      });
    }
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
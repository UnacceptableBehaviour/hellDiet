
import {registerGainedFocusCallback, registerLostFocusCallback} from './focus.js';

function cl(args) {
  console.log(args);
};

// where to look in local storage for current state
const KEY_LAST_KNOWN_STATE = 'state_key';
const KEY_SW_INFO          = 'sw_info';   // must match in SW!

// settings & configuration
const CAMERA_MODE_GALLERY = 0;
const CAMERA_MODE_CAPTURE = 1;
var settings = {
  cameraMode: CAMERA_MODE_GALLERY,
  showExceptions: true,                             // show hand authorized exception in mail breakdown 
};

// +/- Days create a new Date object
Date.prototype.copyAddDays = function(days) {
  let returnDate = new Date(this);
  returnDate.setDate(returnDate.getDate() + parseInt(days));
  return returnDate;
};
// use -ve days to subtract
Date.prototype.addDays = function(days) {
    this.setDate(this.getDate() + parseInt(days));
    return this;
};


//const date = payday;
//const [month, dayOfMonth, day, year] = [date.getMonth(), date.getDate(), date.getDay(), date.getFullYear()];
//const [hour, minutes, seconds] = [date.getHours(), date.getMinutes(), date.getSeconds()];
//class Day extends Date {


// TODO inherit form Date - rmemeber Days was designed for paycheck a lot more diff func!

class Day {
  // for easy internationalisation use Intl.DateTimeFormat
  static numToDay = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  static numToMonth = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  
  static minsToHMReadable(mins){
    return `${Math.floor(mins / 60)}H${(mins % 60).toString().padStart(2, '0')}`;
  }
  static minsToHDecimalReadable(mins){
    return `${(Math.floor(mins / 60) + ((mins % 60) / 60)).toFixed(2)}`;
  }
  
  constructor(date){
    if (!date) date = new Date();
    this.day = Day.numToDay[date.getDay()];     // Mon
    this.dayNo = date.getDay();                 // 1
    //this.HRdate = `${date.getDate()}\u00A0${Day.numToMonth[date.getMonth()]}`;  // 25&nbspAug - 25 Aug
    this.HRdate = `${date.getDate().toString().padStart(2, '0')}${Day.numToMonth[date.getMonth()]}`;  // 25Aug - better for print / email format
    this.year = date.getFullYear();
  }
  
  initFromJSON(jsonObj){
    //cl('initFromJSON-DAY() - - - - - - - - S');
    this.day =  jsonObj.day;
    this.HRdate = jsonObj.HRdate;
    this.year = jsonObj.year
    //cl('initFromJSON-DAY() - - - - - - - - E');
  }
  
}



class LifeExtend15{
  static DAYS_IN_CYCLE = 15;
  static indexToDay = ['sun','mon','tue','wed','thu','fri','sat'];
  
  // TODO - re-use date maths or remove
  // static nextPayDayAfterToday(thisDate = new Date()) {
  //   let refDate = new Date('2022-08-12T04:00:00');
  //   let refWeekNo = 28;
  //   let thisDayMsSinceEpoch = thisDate.getTime();
    
  //   for (let i=0; i<200; i+=1) {  // 13 steps = 1 year (52 / 4week cycle)
  //     if (thisDayMsSinceEpoch < refDate.getTime()) return [refDate, refWeekNo];
  //     refDate.addDays(28);
  //     refWeekNo += 4;
  //     if (refWeekNo > 52) refWeekNo = refWeekNo - 52;
  //     //cl(`nextPD: ${refWeekNo} - ${refDate.toISOString()} - ${refDate.getTime()} - ${refMsSinceEpoch}`);
  //   }
    
  //   // catch
  //   refDate = new Date('2022-08-12T04:00:00'); refWeekNo = 28;
  //   return [refDate, refWeekNo];
  // }
    
  static highLightTodaysEntry(element=undefined){
    if (element) {
      document.querySelector('#date-today').classList.add('day-highlight');
      element.classList.add('day-highlight');
      setTimeout( ()=>{document.querySelector('#date-today').classList.remove('day-highlight');} ,10);
      setTimeout( ()=>{element.classList.remove('day-highlight');} ,10);
    }    
  }
  
  constructor(startDate=null){ // let hd = new LifeExtend15(new Date(2022, 07, 12)); // the month is 0-indexed
    this.today = new Day(new Date());
    this.startDate = new Day(startDate);
    this.startDay = this.startDate.dayNo;
    this.progressDay = this.startDate.day;
    this.progressNo = this.startDate.dayNo;
    this.dayNo = this.startDate.dayNo;
    this.displayDay = this.startDate.dayNo;
    this.updateHTML();
  }

  // nextDay(){
  //   this.progressNo += 1;
  //   let nextDay = new Date(this.startDate.date)
  //   nextDay = nextDay.setDate(this.startDate.date + this.progressNo;
  //   this.progressDay = nextDay.day; //addDays
  //   this.dayNo = nextDay.dayNo;
  //   cl(`DAY:${this.progressNo} = this.progressDay ${this.progressDay} - ${this.dayNo}`);
  // }
  prevDay(){ // debug

  }

  updateToday(){
    this.today = new Day(new Date());
    return this.today;
  }

  initFromJSON(jsonObj){ // let dt = new Date("2022-08-06T03:00:00.000Z")
    //cl('initFromJSON() - - - - - - - - S');
    // this.payDay           = new Date(jsonObj.payDay);   //cl(jsonObj.payDay']);  
    // this.cutOff           = new Date(jsonObj.cutOff);   //cl(jsonObj.cutOff']);
    // this.payStart         = new Date(jsonObj.payStart); //cl(jsonObj.payStart']);
    // this.weekNo           = jsonObj.weekNo;             //cl(jsonObj.weekNo']);
    // this.weekNos          = jsonObj.weekNos;            //cl(jsonObj.weekNos']);
    // this.localStorageKey  = jsonObj.localStorageKey;    //cl(jsonObj.localStorageKey']);    
    // for (let dayNo = 0; dayNo < LifeExtend15.DAYS_IN_CYCLE; dayNo +=1) {
    //   this.daysInCycle[dayNo].initFromJSON(jsonObj.daysInCycle[dayNo]);
    // }
    //cl(`initFromJSON-4WK(): ${this.payDay}-${this.localStorageKey}:${this.weekNos}`);
    //cl('initFromJSON() - - - - - - - - E');
  }
  
  persistentSave(){
    localStorage.setItem(this.localStorageKey, JSON.stringify(this));
  }
  
  // call on submit & week change & lose focus 
  updateModelFromForms(){
    this.updateToday();

  }
  
  updateHTML(){
    // TODAYS DATE
    let todayClockElement;
    document.querySelector('#day_js').textContent = `${this.today.day} - ${this.progressNo}/${LifeExtend15.DAYS_IN_CYCLE}`;
    //document.querySelector('#date-today-day').textContent = this.today.day;
    document.querySelector('#date-today-date').textContent = this.today.HRdate;
    document.querySelector('#date-today-year').textContent = this.today.year;
    this.changeDayText('ct-meal-txt');
  }

  changeDayText(targetDivId, day=null) {
    if (day === null) { day = this.displayDay; }

    let days = [
        {
            'day-title': 'SUNDAY',
            'ml-cont-l': 'Cold or hot chicken or turkey, carrots, cooked cabbage, brocolli or cauliflower. Grapefruit of fruit in season. Tea or coffee w/o milk or sugar., or soda water.',
            'ml-cont-d': 'Plenty of grilled steak, all visible fat removed before eating. Any cut of steak you wish – sirloin, fillet, rump etc. Salad of lettuce cucumber, celery, tomatoes, Brussel sprouts.',
            'class': 'item day'
        },
        {
            'day-title': 'MONDAY',
            'ml-cont-l': 'Assorted cold cuts (your choice – lean meats, chicken, turkey, tongue, beef) Tomatoes – sliced, grilled or stewed. Tea or coffee w/o milk or sugar., or soda water.',
            'ml-cont-d': 'Fish or shell fish, any kind. Combination salad, as many greens and veg as you wish, 1 slice wholemeal bread, toasted. Grapefruit. If not available, use fruits in season.',
            'class': 'item day'
        },
        {
            'day-title': 'TUESDAY',
            'ml-cont-l': 'Fruit salad, any combination of fruits, as much as you want. Tea or coffee w/o milk or sugar.',
            'ml-cont-d': 'Plenty of grilled lean hamburger. Tomatoes, lettuce, celery, olives, Brussel sprouts or cucumber. Tea or coffee w/o milk or sugar. (no more than 4 olives)',
            'class': 'item day'
        },
        {
            'day-title': 'WEDNESDAY',
            'ml-cont-l': 'Tuna fish or salmon salad (oil drained off), with lemon/vinegar dressing. Grapefruit or melon. If not available, use fruits in season. Tea or coffee w/o milk or sugar.',
            'ml-cont-d': 'Sliced roast lamb, all visible fat removed. Salad of lettuce, tomatoes, cucumber, celery. Tea or coffee w/o milk or sugar.',
            'class': 'item day'
        },
        {
            'day-title': 'THURSDAY',
            'ml-cont-l': 'Two eggs any style (no fat used in cooking) Low fat cottage cheese, courgettes or string beans, or sliced or stewed tomatoes. 1 slice wholemeal bread, toasted. Tea or coffee w/o milk or sugar.',
            'ml-cont-d': 'Roast, grilled or BBQ chicken, all you want (and visible fat removed before eating) Plenty of spinach, green peppers, string beans. Tea or coffee w/o milk or sugar.',
            'class': 'item day'
        },
        {
            'day-title': 'FRIDAY',
            'ml-cont-l': 'Assorted cheese slices. Spinach all you want, 1 slice wholemeal bread toasted. Tea or coffee w/o milk or sugar.',
            'ml-cont-d': 'Fish / shellfish. Combination salad and any and as much fresh vegetables as desired. Inc cold diced cooked vegetables if preferred. 1 slice wholemeal. Tea or coffee w/o milk or sugar.',
            'class': 'item day'
        },
        {
            'day-title': 'SATURDAY',
            'ml-cont-l': 'Cold or hot chicken or turkey, carrots, cooked cabbage, brocolli or cauliflower. Grapefruit of fruit in season. Tea or coffee w/o milk or sugar., or soda water.',
            'ml-cont-d': 'Roast poultry skin & fat removed after cooking. Tomatoes & lettuce prepared however you like without any fat or sugar. Fruit in season.',
            'class': 'item day'
        }        
    ];

    let targetDiv = document.getElementById(targetDivId);
    targetDiv.replaceChildren();
    let dayData = days[day];

    let dayElement = document.createElement('div');
    dayElement.id = `dy-content-${day}`;
    dayElement.className = dayData['class'];
    targetDiv.appendChild(dayElement);

    let titleElement = document.createElement('div');
    titleElement.className = "day-title";
    titleElement.textContent = dayData['day-title'];
    dayElement.appendChild(titleElement);

    let contentElement = document.createElement('div');
    contentElement.className = "day-time";
    dayElement.appendChild(contentElement);

    let lunchTitleElement = document.createElement('div');
    lunchTitleElement.className = "meal-title-l";
    lunchTitleElement.textContent = "Lunch";
    contentElement.appendChild(lunchTitleElement);

    let lunchContentElement = document.createElement('div');
    lunchContentElement.className = "meal-content-l";
    lunchContentElement.textContent = dayData['ml-cont-l'];
    contentElement.appendChild(lunchContentElement);

    contentElement.appendChild(document.createElement('br'));

    let dinnerTitleElement = document.createElement('div');
    dinnerTitleElement.className = "meal-title-d";
    dinnerTitleElement.textContent = "Dinner";
    contentElement.appendChild(dinnerTitleElement);

    let dinnerContentElement = document.createElement('div');
    dinnerContentElement.className = "meal-content-d";
    dinnerContentElement.textContent = dayData['ml-cont-d'];
    contentElement.appendChild(dinnerContentElement);
  }  

}



// - - - - - - - - - - - - - - - - - - - - - - - - APP START- - - - - - - - - - - - - - - = = = <


var hd = new LifeExtend15(new Date()); // TODO check local storage and reconstitute if present.
var stateKey = '';
//cl(hd);

if (KEY_LAST_KNOWN_STATE in localStorage) {  // retrieve current statekey, and 4wk cycle object
  stateKey = localStorage.getItem(KEY_LAST_KNOWN_STATE);
  if (stateKey in localStorage) {
    let jsonObj = JSON.parse(localStorage.getItem(stateKey));
    hd.initFromJSON(jsonObj);
    cl(`LOADED LifeExtend15 object key: ${stateKey} < from localStrorage\n- KEYS Match: ${stateKey === hd.localStorageKey}`);  
  }
} else {
  // save a new state key
  localStorage.setItem(KEY_LAST_KNOWN_STATE, hd.localStorageKey);
}

function addDebugLine(text) {
  return `<br>${text}`;
}

function debugInfo(args) {
  let debugText = "* * * DEBUG INFO (beta release) * * * ";
  debugText += addDebugLine('');
  debugText += addDebugLine(`hellDiet V.beta / SW xx.xx`); // verion_number_passed_in
  debugText += addDebugLine('');
  debugText += addDebugLine('-');
  
  if (KEY_SW_INFO in localStorage) {
    swInfo = localStorage.getItem(KEY_SW_INFO);
    
    debugText += addDebugLine(`SW version: ${swInfo.swVersion}`);
    debugText += addDebugLine(`cache: ${swInfo.cacheName}`);
  } else {
    debugText += addDebugLine('** WARNING **');
    debugText += addDebugLine(`KEY: ${KEY_SW_INFO} < Not found.`);
  }
  
  return debugText;
}

var theRules =`1. Don't drink any alcohol. (or your will power will fly out of the window!)
2. Other drinks should not contain fat or sugar and minimal calories: tea, coffee, water, electrolyte drink.
3. Don't use any fat in cooking.
4. Remove any skin & fat from meats before cooking.
5. A guidline for the amount of meat/fish to be prepared is 1g/lb of bodyweight.
6. Eat what's assigned for the day NO freestyling! (unless it involves leaving things out)
7. If you want to snack between meals snack on raw carrots, peppers or tomatoes.
8. Dress salads w/ fat free & sugar free dressings. Avoid mayonaise and oil based vinaigrettes.
9. Once you are full stop eating. Stop it! Put the fork down! Move away from the plate!`

function displayFlash(event, id, classSpecific, classShow, innerHTML='') {
  cl(`> = = = POP FLASH ${id} = = = <`);
  let targetBtn = event.target;
  let debugDiv = document.createElement('div');
  debugDiv.id = id;
  debugDiv.style.caretColor = 'transparent';
  debugDiv.classList.add("flash", ...classSpecific); // add remove toggle
  //debugDiv.innerHTML = debugInfo();
  debugDiv.innerHTML = innerHTML;
  document.body.appendChild(debugDiv);
  targetBtn.classList.add('btn-disable');
  
  setTimeout(()=>{debugDiv.classList.add(classShow); cl('-SHOW-');}, 5);  
  
  document.getElementById(id).addEventListener('click', function(event){
    cl(`> = = = HIDE FLASH ${id} = = = <`);
    debugDiv.addEventListener('transitionend', (event)=>{ // NOT animationend
      debugDiv.remove();
      targetBtn.classList.remove('btn-disable');
      //cl('-transitionEnd-');
    });    
    debugDiv.classList.remove(classShow);  // NOT animate! TRANSITION!
  });  
}

window.addEventListener('load',function(){
  cl('LOADED - adding event listeners');
  hd.updateHTML();
  cl(hd);

  // << 4WK
  document.querySelector('#but_4wk_bak').addEventListener('click', function(event){
    cl(`DAY -= 1 now:${hd.progressDay} 00`);
    hd.progressDay -= 1;
    if (hd.progressDay < 0) hd.progressDay = 6;
    cl(`${Day.numToDay[hd.progressDay]} - ${hd.progressDay}`)

    // TODO REMOVE
    // todayClockElement = document.querySelector(`#${LifeExtend15.indexToDay[dayNo % 7]}_out`).parentElement;

    // LifeExtend15.highLightTodaysEntry(todayClockElement);      
    let flashDayElement = document.querySelector('#sel-day-1');
    LifeExtend15.highLightTodaysEntry(flashDayElement);

    hd.persistentSave();
        
    //hd = new LifeExtend15();  // create new payCycle object w/ LAST paydate & starting weekNo TODO REMOVE
      
    if (hd.localStorageKey in localStorage) {     // populate new payCycle w/ stored payCycle if it exists
      let jsonObj = JSON.parse(localStorage.getItem(hd.localStorageKey));
      hd.initFromJSON(jsonObj);
      cl(hd);          
    }    
    localStorage.setItem(KEY_LAST_KNOWN_STATE, hd.localStorageKey);

    hd.updateHTML();
  });
    
  // 4WK >>
  document.querySelector('#but_4wk_fwd').addEventListener('click', function(event){
    cl(`DAY += 1 now:${hd.progressDay} 00`);
    hd.progressDay += 1;
    hd.progressDay = hd.progressDay % 7;
    cl(`${Day.numToDay[hd.progressDay]} - ${hd.progressDay}`)

    hd.nextDay();

    hd.persistentSave();
        
    //hd = new LifeExtend15();  // create new payCycle object w/ NEXT paydate & starting weekNo
      
    if (hd.localStorageKey in localStorage) {     // populate new payCycle w/ stored payCycle if it exists
      let jsonObj = JSON.parse(localStorage.getItem(hd.localStorageKey));
      hd.initFromJSON(jsonObj);
      cl(hd);          
    }
    
    localStorage.setItem(KEY_LAST_KNOWN_STATE, hd.localStorageKey);

    hd.updateHTML();

  });

  // DAY SLECT BUTTONS
  // REFACTOR INTO A LOOP
  const ids = ['0', '1', '2', '3', '4', '5', '6', '99'];

  ids.forEach(id => {
    document.querySelector(`#sel-day-${id}`).addEventListener('click', function(event) {
      console.log(`#sel-day-${id}: ${hd.updateToday().day} - ${event.target.getAttribute('value')}`);
      console.log(event.target);
      
      hd.displayDay = event.target.getAttribute('value');
      hd.updateHTML();
      hd.persistentSave();      
    });
  });
  
  document.querySelector('#start_but').addEventListener('click', function(event) {
    event.target.innerHTML = 'STOP';
    hd.progressDay = hd.updateToday();
    hd.progressNo = 0;
    hd.updateHTML();
    hd.persistentSave();
    console.log(`START: ${hd.progressDay}: ${hd.updateToday().day}`);
  });
  


  // store data on lost focus
  registerLostFocusCallback(function(){
    //cl(`LostFocus, storing:${hd.localStorageKey} - - - - - - S`);
    hd.updateModelFromForms();
    hd.persistentSave();
    //cl(`LostFocus, stored:${hd.localStorageKey} - - - - - - E`);
  });
  registerGainedFocusCallback(function(){
    hd.updateHTML();
    //cl('GainedFocus.');
  });

  document.querySelectorAll('label.imgSelect input[accept*="image"]').forEach(item => {
    item.addEventListener('change', event => {
      cl('TimeBox change - - - - - S');
      let fourDigitTime;
      
      //CAMERA_MODE_CAPTURE = 1; - requires HTML edit - not implemented
      if (settings.cameraMode) {
        cl('cameraMode: CAMERA_MODE_CAPTURE');
        //cl(event.srcElement.files[0].lastModified);
        let d = new Date(event.srcElement.files[0].lastModified);
        fourDigitTime = `${d.getHours()}${d.getMinutes()}`;
        //let timeFromLastModified = `timeFromLastModified: <${fourDigitTime}>`;
        //cl(timeFromLastModified);
        
      } else {
        cl('cameraMode: CAMERA_MODE_GALLERY');
        let filename = event.srcElement.files[0].name;
        cl(filename);
  
        let hrsMins = filename.match(/\b\d{8}_(\d\d)(\d\d)\d\d\b/); // 202216181_142855.jpg
        if (hrsMins) {
          //cl(hrsMins);      
          fourDigitTime = `${hrsMins[1]}${hrsMins[2]}`;
          cl(`Time match: <${fourDigitTime}>`);
        } else {
          cl(`No match in: ${filename} <`);
        }        
      }
      
      event.target.parentElement.childNodes[1].textContent = fourDigitTime; // TODO choose span element instead of hardcode 1
      hd.updateModelFromForms();
      hd.persistentSave();
      hd.updateHTML();
      cl('TimeBox change - - - - - E');
    });
  });

  document.querySelectorAll('.break').forEach(item => {
    //cl('Add event listener for');
    //cl(item);
    item.addEventListener('change', event => {
      hd.updateModelFromForms();
      hd.persistentSave();
      hd.updateHTML();          
    });
  });  
  
  document.querySelectorAll('.hrs-row').forEach(item => {
    cl(item);
    item.addEventListener('dblclick', event => {
      cl('DB-CLICK');
      cl(event);
      cl(event.target);
      cl(event.target.parentElement);
      cl(event.target.parentElement.id);
      
      let dayNo = parseInt(event.target.parentElement.id);      
      hd.clearHours(dayNo);
      hd.persistentSave();
      hd.updateHTML();            
    });
  });

  
  // Debug / HELP button
  // click to create minimised 
  // transition to large by adding class
  // display info wait for click
  // transition to minimised
  // delete element on transistionend event
  // NOTE: there are transitionend AND animationend EVENTS
  if (document.querySelector('#debug_img')) {
    document.querySelector('#debug_img').addEventListener('click', function(event){  
      //displayFlash(event, id, classSpecific, classShow, innerHTML='')
      displayFlash(event, 'flash-dbg', ['flash-dbg'], 'flash-dbg-show', debugInfo());
    });
  }

  if (document.querySelector('#qr_but')) {
    document.querySelector('#qr_but').addEventListener('click', function(event){  
      //displayFlash(event, id, classSpecific, classShow, innerHTML='')
      let img = '<img src="static/assets/images/hellDiet-QR-short.png">';
      displayFlash(event, 'flash-QR', ['flash-qr'], 'flash-qr-show', img);
    });  
  }

  if (document.querySelector('#rul_but')) {
    document.querySelector('#rul_but').addEventListener('click', function(event){  
      //displayFlash(event, id, classSpecific, classShow, innerHTML='')
      let htmlRules = theRules.replace(/\n/g, '<br><br>');
      cl(' - - - -  htmlRules - - - S');
      cl(htmlRules);
      cl(' - - - -  htmlRules - - - E');
      displayFlash(event, 'flash-Rules', ['flash-qr'], 'flash-qr-show', htmlRules);
    });  
  }
  
});  // load END - - - - <



// saving images . . . 
function hasGetUserMedia() {
  return !!(navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia);
}

if (hasGetUserMedia()) {
  // Good to go!
  cl('hasGetUserMedia() - SUCCEEDED');
} else {
  cl('hasGetUserMedia() - FAILED');
  // alert('getUserMedia() is not supported by your browser');
}

// - - - Getting image info - - -
// <input style='width:100%;' id="image_input" type="file" name="video" accept="image/*" capture="capture"> CAMERA
// <input style='width:100%;' id="image_input" type="file" name="video" accept="image/*" > GALLERY
//> console
//document.getElementById("image_input").files[0];
//File {  name: 'hD.png', 
//        lastModified: 1660913175719,
//        lastModifiedDate: Fri Aug 19 2022 13:46:15 GMT+0100 (British Summer Time),
//        webkitRelativePath: '',
//        size: 20964, …}
//        
//document.getElementById("image_input").files[0].name;
//'hD.png'
//
//document.getElementById("image_input").files[0].lastModified;
//1660913175719
//d = new Date(1660913175719)
//Fri Aug 19 2022 13:46:15 GMT+0100 (British Summer Time)
//d.getHours()
//13
//d.getMinutes()
//46
//timeIn = `${d.getHours()}${d.getMinutes()}`
//'1346'

// https://stackoverflow.com/questions/2705583/how-to-simulate-a-click-with-javascript
//document.getElementById("image_input").click();
//this is pointless because it triggers before file  / image selected / capured!

//document.getElementById("sun_in").files[0];
//
////https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/change_event
//// attaching 
//document.getElementById("image_input").addEventListener('change', (event) => {
//  const result = document.querySelector('.result');
//  result.textContent = `You like ${event.target.value}`;
//});

// 

//// HTML & JS - to take image with CAM or pick from GALLERY
////
//// <td><input id="sun_in" type="file" name="video" accept="image/*" value="0728"></td>
//// select image from gallery - CORRECT TIME from FILENAME & LASTMODIFIED
//// document.querySelector('#sun_in').addEventListener('change', function(event){
////
//// <td><input id="mon_in" type="file" name="video" accept="image/*" capture="capture" value="0728"></td>
//// take image using camera - CORRECT TIME from LASTMODIFIED ONLY image name is '32ish decimal digits'.jpg 
//document.querySelector('#sun_in').addEventListener('change', function(event){
//  cl('#sun_in EvntList change - - - - - S');
//  cl(event);
//  cl(event.srcElement.files[0]);
//  let filename = event.srcElement.files[0].name;
//  cl(filename);
//  cl(event.srcElement.files[0].lastModified);
//  let d = new Date(event.srcElement.files[0].lastModified);
//  let timeFromLastModified = `timeFromLastModified: ${d.getHours()} ${d.getMinutes()}`;
//  cl(timeFromLastModified);
//  let hrsMins = filename.match(/\b\d{8}_(\d\d)(\d\d)\d\d\b/);
//  let timeMatch;
//  if (hrsMins) {
//    cl(hrsMins);      
//    timeMatch = `${hrsMins[1]}${hrsMins[2]}`;
//    cl(timeMatch);
//  } else {
//    timeMatch = `No match in: ${filename} <`
//    cl(timeMatch);
//  }
//  filename = '202216181_142855.jpg';
//  hrsMins = filename.match(/\b\d{8}_(\d\d)(\d\d)\d\d\b/);
//  cl(hrsMins);
//  document.querySelector('#dgb_03').textContent = timeFromLastModified;
//  document.querySelector('#dgb_04').textContent = timeMatch;
//  cl('#sun_in EvntList change - - - - - E');
//});

// turning the Choose file look of the input into a box with the time in it

// More on camera access
// https://web.dev/media-capturing-images/
// more indepth
// https://developer.mozilla.org/en-US/docs/Web/API/Media_Capture_and_Streams_API/Taking_still_photos

// Storing result to Gallery


// = = = minimum 'viable product' = = = 
// Mobile display with all data summarised content sharable (eMail)
// WORKING

// TODO - SINGLE USER

// CRITICAL - - - - - - - - - - - - - - - - - - - -
// works OFFLINE

// RESPONSIVE display


// NICE TO HAVE - - - - - - - - - - - - - - - - - -
// QR code to share app

// Take photo of Clock in machine store time & photo in gallery for recall if necessary
// https://stackoverflow.com/questions/23916566/html5-input-type-file-accept-image-capture-camera-display-as-image-rat

// Print Summary from app

// add QR code to spread app




























// HIGH - multi user
// synch data desktop /mobile
// need login (w/ gmail?)

// MEDIUM
// add rollover calc for (night shift workers) IE start: 2200 end 0800
//    - check epoch timestamp take care of this
// add feedback form
// add email feedback - mailto: ?
// add chat board - requires server?

// LOW
// add responsive display to include desktop
//    detecting device type mobile / desktop physical screen size in cm or inches
//    dimension show as approx:
//    desktop: 1120 x 600
//    mobile:  980 x 1964
//
//    FCC video tutorial - see
//    see repos/lang/html_css_js/css_tests : 
//
// Android Dev info
// https://developer.android.com/guide/practices/screens_support
// Media Query for different Devices
// https://css-tricks.com/snippets/css/media-queries-for-standard-devices/

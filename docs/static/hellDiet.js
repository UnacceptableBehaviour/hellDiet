
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
const HOURLY_RATE_2022 = 10.10;
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
class Day{
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
    //this.date = date;
    this.day = Day.numToDay[date.getDay()];     // Mon
    //this.HRdate = `${date.getDate()}\u00A0${Day.numToMonth[date.getMonth()]}`;  // 25&nbspAug - 25 Aug
    this.HRdate = `${date.getDate().toString().padStart(2, '0')}${Day.numToMonth[date.getMonth()]}`;  // 25Aug - better for print / email format
    this.inTime = '';         // 0728
    this.breakTime = '30';    // 30     break time in mins
    this.outTime = '';        // 1553
    this.totalMins = 0;       // integer
    this.totalALMins = 0;     // integer
    this.year = date.getFullYear();
  }
  
  initFromJSON(jsonObj){
    //cl('initFromJSON-DAY() - - - - - - - - S');
    this.day =  jsonObj.day;
    this.HRdate = jsonObj.HRdate;
    this.inTime = jsonObj.inTime;
    this.breakTime = jsonObj.breakTime;
    this.outTime = jsonObj.outTime;
    this.totalMins = jsonObj.totalMins;
    this.totalALMins = jsonObj.totalALMins;
    if (this.totalALMins === undefined) this.totalALMins = 0;
    this.totalMinsReadableHM  = jsonObj.totalMinsReadableHM;
    this.totalMinsDecimalHM = jsonObj.totalMinsDecimalHM;
    //cl(`initJSON-DAY(): ${this.day}-${this.HRdate}:${this.inTime}-${this.breakTime}-${this.outTime}`);
    //cl('initFromJSON-DAY() - - - - - - - - E');
  }
  
  setHours(start, breakStr, finish){
    this.inTime = start;        // 0728
    this.breakTime = breakStr;  // 30     break time in mins / or  AL anual leave
    this.outTime = finish;      // 1553
    //cl(`in: ${start} break: ${breakStr} out: ${finish}`);
    if (this.breakTime === 'AL') { // Anual Leave - 7hr day
      this.inTime = '0700';
      this.outTime = '1400';
      this.totalMins = 0;
      this.totalALMins = 7 * 60;
      this.totalMinsReadableHM = '7H00';
      this.totalMinsDecimalHM = '7.00';

    } else {
      if ((start === '') || (finish === '')) {
        this.totalMins = 0;
        return;
      }
  
      // finish time to mins
      let hrsF = parseInt(finish.substr(0,2));
      let minF = parseInt(finish.substr(2,4));
      let toEnd = hrsF*60 + parseInt(minF);
      //cl(`finish: ${finish} -: ${toEnd} - hrs: ${hrsF} - mins:${minF} - hrs ${finish.slice(0,2)}`);
      
      // start time to mins inc 15m roundup
      let hrsS = parseInt(start.substr(0,2));
      let minS = parseInt(start.substr(2,4));
      
      //let roundupMins = minS + (15 - (minS % 15));                  // round up to the next nearest 15min 0701 = 0715 walmart sneakiness
      let roundupMins = minS? (minS-1) + (15 - ((minS-1) % 15)) : 0;  // round to nearest 15m  0=0, 1-15=15, 16-30=30, 31-45=45, 46-59=60
      let fromStart = hrsS*60 + roundupMins;
      
      //cl(`start: ${start} -: ${fromStart} - hrs: ${hrsS} - mins:${minS} - rnd:${roundupMins} - hrs ${start.slice(0,2)}`);
      
      // mins to hhHmm 7H53
      // mins to decimal HRS 7.88Hrs
      let breakMins = parseInt(this.breakTime);
      let totalMins;
      if (toEnd <= (fromStart + breakMins)) {
        const ONE_DAY = 24*60;
        totalMins = (ONE_DAY - fromStart) + toEnd - breakMins;      
      } else {
        totalMins = toEnd - fromStart - breakMins;
      }
      
      this.totalMins = totalMins;
      this.totalMinsReadableHM = `${Math.floor(this.totalMins / 60)}H${(this.totalMins % 60).toString().padStart(2, '0')}`;
      this.totalMinsDecimalHM = `${(Math.floor(this.totalMins / 60) + ((this.totalMins % 60) / 60)).toFixed(2)}`;      
    }  
  }
  
  clearHours(){
    this.inTime = '';
    this.breakTime = '30';
    this.outTime = '';
    this.totalMins = 0;
    this.totalALMins = 0;
    this.totalMinsReadableHM = '';
    this.totalMinsDecimalHM = '';
  }
  
}



class PayCycle4wk{
  static DAYS_IN_CYCLE = 15;
  static prefixes = ['sun','mon','tue','wed','thu','fri','sat'];
  static postfixes = ['_date_js','_in','_break','_out','_hrs','_dhrs','',''];
  
  static nextPayDayAfterToday(thisDate = new Date()) {
    let refDate = new Date('2022-08-12T04:00:00');
    let refWeekNo = 28;
    let thisDayMsSinceEpoch = thisDate.getTime();
    
    for (let i=0; i<200; i+=1) {  // 13 steps = 1 year (52 / 4week cycle)
      if (thisDayMsSinceEpoch < refDate.getTime()) return [refDate, refWeekNo];
      refDate.addDays(28);
      refWeekNo += 4;
      if (refWeekNo > 52) refWeekNo = refWeekNo - 52;
      //cl(`nextPD: ${refWeekNo} - ${refDate.toISOString()} - ${refDate.getTime()} - ${refMsSinceEpoch}`);
    }
    
    // catch
    refDate = new Date('2022-08-12T04:00:00'); refWeekNo = 28;
    return [refDate, refWeekNo];
  }
    
  static highLightTodaysEntry(element=undefined){
    if (element) {
      document.querySelector('#date-today').classList.add('day-highlight');
      element.classList.add('day-highlight');
      setTimeout( ()=>{document.querySelector('#date-today').classList.remove('day-highlight');} ,10);
      setTimeout( ()=>{element.classList.remove('day-highlight');} ,10);
    }    
  }
  
  constructor(payDay, startWkNo){ // let pc = new PayCycle4wk(new Date(2022, 07, 12)); // the month is 0-indexed

  }
  
  initFromJSON(jsonObj){ // let dt = new Date("2022-08-06T03:00:00.000Z")
    //cl('initFromJSON() - - - - - - - - S');
    this.payDay           = new Date(jsonObj.payDay);   //cl(jsonObj.payDay']);  
    this.cutOff           = new Date(jsonObj.cutOff);   //cl(jsonObj.cutOff']);
    this.payStart         = new Date(jsonObj.payStart); //cl(jsonObj.payStart']);
    this.weekNo           = jsonObj.weekNo;             //cl(jsonObj.weekNo']);
    this.weekNos          = jsonObj.weekNos;            //cl(jsonObj.weekNos']);
    this.localStorageKey  = jsonObj.localStorageKey;    //cl(jsonObj.localStorageKey']);    
    for (let dayNo = 0; dayNo < PayCycle4wk.DAYS_IN_CYCLE; dayNo +=1) {
      this.daysInCycle[dayNo].initFromJSON(jsonObj.daysInCycle[dayNo]);
    }
    //cl(`initFromJSON-4WK(): ${this.payDay}-${this.localStorageKey}:${this.weekNos}`);
    //cl('initFromJSON() - - - - - - - - E');
  }
  
  persistentSave(){
    localStorage.setItem(this.localStorageKey, JSON.stringify(this));
  }
  
  // call on submit & week change  
  updateModelFromForms(){

  }
  
  updateHTML(){
    // TODAYS DATE
    let todayClockElement;
    let today = new Day(new Date());
    document.querySelector('#date-today-day').textContent = today.day;
    document.querySelector('#date-today-date').textContent = today.HRdate;
    document.querySelector('#date-today-year').textContent = today.year;
    

  }

  emailVersionSummary(emailFormat=FORMAT_EMAIL){ 
    // feels like a rehash of updateHTML - maybe a smarter way to do both?
  }

}



// - - - - - - - - - - - - - - - - - - - - - - - - APP START- - - - - - - - - - - - - - - = = = <


var pc = new PayCycle4wk(...PayCycle4wk.nextPayDayAfterToday());
var stateKey = '';
//cl(pc);

if (KEY_LAST_KNOWN_STATE in localStorage) {  // retrieve current statekey, and 4wk cycle object
  stateKey = localStorage.getItem(KEY_LAST_KNOWN_STATE);
  if (stateKey in localStorage) {
    let jsonObj = JSON.parse(localStorage.getItem(stateKey));
    pc.initFromJSON(jsonObj);
    cl(`LOADED PayCycle4wk object key: ${stateKey} < from localStrorage\n- KEYS Match: ${stateKey === pc.localStorageKey}`);  
  }
} else {
  // save a new state key
  localStorage.setItem(KEY_LAST_KNOWN_STATE, pc.localStorageKey);
}

function addDebugLine(text) {
  return `<br>${text}`;
}

function debugInfo(args) {
  let debugText = "* * * DEBUG INFO (beta release) * * * ";
  debugText += addDebugLine('');
  debugText += addDebugLine(`hellDiet V00.01 / SW 00.01`); // verion_number_passed_in
  debugText += addDebugLine('');
  
  // based on
  debugText += addDebugLine(`Based on year: ${settings.taxYear}`);
  debugText += addDebugLine('UK-ENGLAND');
  debugText += addDebugLine('-');
  debugText += addDebugLine('AL: Annual Leave');
  debugText += addDebugLine('-');
  debugText += addDebugLine(`TAX_RATE_2022/3: ${(settings.TAX_RATE_2022 * 100).toFixed(2)}%`);
  debugText += addDebugLine(`TAX_2022_ALLOWANCE: £${settings.TAX_2022_ALLOWANCE}`);
  debugText += addDebugLine(`NI_RATE_2022_23: ${(settings.NI_RATE_2022_23 * 100).toFixed(2)}%`);
  debugText += addDebugLine(`NI_2022_23_ALLOWANCE: £${settings.NI_2022_23_ALLOWANCE}`);
  debugText += addDebugLine(`HOURLY_RATE_2022: £${(settings.HOURLY_RATE_2022).toFixed(2)}`);
  debugText += addDebugLine(`HOURLY_RATE_2022_AL: £${settings.HOURLY_RATE_AL_2022}`);
  debugText += addDebugLine('(fixed:TODO update model)');
  debugText += addDebugLine(`PENSION_PC: ${(settings.PENSION_PC * 100).toFixed(2)}%`);
  debugText += addDebugLine('(fixed:TODO update model)');
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

function displayFlash(event, id, classSpecific, classShow, innerHTML='') {
  cl(`> = = = POP FLASH ${id} = = = <`);
  let targetBtn = event.target;
  let debugDiv = document.createElement('div');
  debugDiv.id = id;
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
  pc.updateWeekTotalMins();
  pc.finalCalulations();  
  pc.updateHTML();
  cl(pc);
  
  // FORWARD & BACK BUTTONS WEEK & MONTH
  // << WEEK
  document.querySelector('#but_wk_no_bak').addEventListener('click', function(event){
    pc.updateModelFromForms();    
    pc.weekBak();
    pc.updateHTML();
    pc.persistentSave();    
    //console.log(`Week BACK - WkNo: ${pc.getWeekNo()}`);      
  });
  
  // WEEK >>
  document.querySelector('#but_wk_no_fwd').addEventListener('click', function(event){
    pc.updateModelFromForms();
    pc.weekFwd();    
    pc.updateHTML();
    pc.persistentSave();    
    //console.log(`Week FORWARD - WkNo: ${pc.getWeekNo()}`);
  });
  
  // << 4WK
  document.querySelector('#but_4wk_bak').addEventListener('click', function(event){
    // cl('MOVE TO LAST 4WK CYCLE');
    
    pc.persistentSave();
        
    pc = new PayCycle4wk(...pc.getLastPayDay());  // create new payCycle object w/ LAST paydate & starting weekNo                                                  
      
    if (pc.localStorageKey in localStorage) {     // populate new payCycle w/ stored payCycle if it exists
      let jsonObj = JSON.parse(localStorage.getItem(pc.localStorageKey));
      pc.initFromJSON(jsonObj);
      cl(pc);          
    }    
    localStorage.setItem(KEY_LAST_KNOWN_STATE, pc.localStorageKey);

    pc.updateWeekTotalMins();
    pc.finalCalulations();         
    pc.updateHTML();
  });
  
  // 4WK >>
  document.querySelector('#but_4wk_fwd').addEventListener('click', function(event){
    //cl('MOVE TO NEXT 4WK CYCLE');  

    pc.persistentSave();
        
    pc = new PayCycle4wk(...pc.getNextPayDay());  // create new payCycle object w/ NEXT paydate & starting weekNo
      
    if (pc.localStorageKey in localStorage) {     // populate new payCycle w/ stored payCycle if it exists
      let jsonObj = JSON.parse(localStorage.getItem(pc.localStorageKey));
      pc.initFromJSON(jsonObj);
      cl(pc);          
    }
    
    localStorage.setItem(KEY_LAST_KNOWN_STATE, pc.localStorageKey);

    pc.updateWeekTotalMins();
    pc.finalCalulations();          
    pc.updateHTML();

  });

  // store data on lost focus
  registerLostFocusCallback(function(){
    //cl(`LostFocus, storing:${pc.localStorageKey} - - - - - - S`);
    pc.updateModelFromForms();
    pc.persistentSave();
    //cl(`LostFocus, stored:${pc.localStorageKey} - - - - - - E`);
  });
  registerGainedFocusCallback(function(){
    pc.updateHTML();
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
      pc.updateModelFromForms();
      pc.persistentSave();
      pc.updateHTML();
      cl('TimeBox change - - - - - E');
    });
  });

  document.querySelectorAll('.break').forEach(item => {
    //cl('Add event listener for');
    //cl(item);
    item.addEventListener('change', event => {
      pc.updateModelFromForms();
      pc.persistentSave();
      pc.updateHTML();          
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
      pc.clearHours(dayNo);
      pc.persistentSave();
      pc.updateHTML();            
    });
  });

  // Mailing summary
  document.querySelector('#mail_img').addEventListener('click', function(event){
    //cl('> = = = MAIL SUMMARY= = = <');
    let address = 'a.b@g.com';
    let subject = 'payCheck Summary';  
    window.location = `mailto:${address}?subject=${subject}&body=${pc.emailVersionSummary()}`;
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
      displayFlash(event, 'flash_dbg', ['flash-dbg'], 'flash-dbg-show', debugInfo());
    });
  }

  if (document.querySelector('#qr_but')) {
    document.querySelector('#qr_but').addEventListener('click', function(event){  
      //displayFlash(event, id, classSpecific, classShow, innerHTML='')
      let img = '<img src="static/assets/images/hellDiet-QR-short.png">';
      displayFlash(event, 'flash_QR', ['flash-qr'], 'flash-qr-show', img);
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



document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    if(urlParams.has('userId')){
        
    }else{
        console.warn("No userId found in URL parameters.");
    }

});
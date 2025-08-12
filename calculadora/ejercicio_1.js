  
  function calcular (){

    let num1 =parseFloat(document.getElementById("num1").value);
    let num2 = parseFloat(document.getElementById("num2").value);



    let resultado;

if (document.getElementById("suma").checked){
    resultado = num1+ num2;
}else if (document.getElementById("resta").checked){
    resultado =num1-num2;
} else if (document.getElementById("multiplicacion").checked){
    resultado =num1 * num2;

} else if(document.getElementById("division").checked){
    if(num2!== 0 ){
        resultado = num1 / num2;
    }else{
        resultado="error"
    }
}
else {
    resultado ="por favor selecccione una operacion"
}




document.getElementById("resultado").innerText = "Resultado:" + resultado


}





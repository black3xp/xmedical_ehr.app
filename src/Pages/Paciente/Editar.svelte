<script>
    import Header from "../../Layout/Header.svelte";
    import Aside from "../../Layout/Aside.svelte";
</script>

<Aside />

<main class="admin-main">
  <Header />
  <section class="admin-content">
    <div class="col-lg-8 m-b-30 m-auto" style="margin-top:50px !important;">
<div class="card m-b-30">
<div class="card-header">
    <h5 class="m-b-0">
        Nuevo Paciente
    </h5>

</div>
<div class="card-body" id="divDocumento">
    <div class="row">
        <div class="col-lg-12">

            <form id="frmDatosGenerales">
                <input type="hidden" name="idPaciente" value="">
                <div class="form-row">
                    <div class="form-group col-md-6">
                        <label for="">Cedula / Pasaporte</label>
                        <input type="text" class="form-control" name="Cedula" id="txtCedula" pattern="^[0-9]+$" maxlength="11">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group col-md-12">
                        <label for="">Nombre(s)</label>
                        <input type="name" class="form-control" name="Nombres" max="100" required="">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group col-md-6">
                        <label for="">Primer Apellido</label>
                        <input type="last-name" class="form-control" name="PrimerApellido" max="100" required="">
                    </div>
                    <div class="form-group col-md-6">
                        <label for="">Segundo Apellido</label>
                        <input type="last-name" class="form-control" name="SegundoApellido" id="txtApellido" max="100">
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group col-md-6">
                        <label for="">Sexo</label>
                        <select class="form-control" name="Sexo" id="slSexo" required=""><option value="">- Seleccionar -</option><option value="M">Masculino</option><option value="F">Femenino</option>
                        </select>

                    </div>
                    <div class="col-md-6 form-group">
                        <label>Fecha de nacimiento</label>
                        <input type="date" name="FechaNacimiento" class="form-control" id="txtFechaNacimiento" placeholder="00/00/0000" autocomplete="off" required="">

                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group col-md-6">
                        <label for="">Telefono</label>
                        <input type="text" class="form-control" data-mask="(000) 000-0000" data-mask-clearifnotmatch="true" autocomplete="off" maxlength="14" placeholder="(809) 000-0000" name="Telefono" id="txtTelefono" max="15">
                    </div>
                    <div class="form-group col-md-6">
                        <label for="">Celular</label>
                        <input type="text" class="form-control" data-mask="(000) 000-0000" data-mask-clearifnotmatch="true" autocomplete="off" maxlength="14" placeholder="(809) 000-0000" name="Celular" id="txtCelular" max="15">
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group col-md-6">
                        <label for="">Email</label>
                        <input type="email" class="form-control" placeholder="prueba@correo.com" name="Correo" id="txtCorreo">
                    </div>
                    <div class="form-group col-md-6">
                        <label for="">Estado Civil</label>
                        <select class="form-control" name="EstadoCivil" id="slEstadoCivil" required="">
                            <option value=""> - Seleccionar -</option>
                            <option value="S">Soltero</option>
                            <option value="C">Casado</option>
                            <option value="D">Divorciado</option>
                            <option value="UL">Union Libre</option>
                        </select>
                    </div>
                </div>
                <br>
                <h5 style="margin-bottom: 0;">Datos de Aseguradora</h5><br>
                <hr style="margin-top: 0;">
                <div class="form-row">
                    <div class="form-group col-md-6">
                        <label class="font-secondary">Seguro médico </label>
                        <select class="form-control" id="sltAseguradora" style="width: 100%;" tabindex="-1" aria-hidden="true" name="IdAseguradora">
                            <option value="">- seleccionar seguro -</option>
                            <option value="3" data-select2-id="39">ARS C.M.D</option>
                            <option value="4" data-select2-id="40">ARS UNIVERSAL</option>
                            <option value="5" data-select2-id="41">ARS COLONIAL</option>
                            <option value="6" data-select2-id="42">ARS MONUMENTAL</option>
                            <option value="7" data-select2-id="43">ARS CONSTITUCION</option>
                            <option value="8" data-select2-id="44">ARS SEMUNASED</option>
                            <option value="9" data-select2-id="45">ARS RENACER</option>
                            <option value="10" data-select2-id="46">ARS RESERVAS INC.</option>
                            <option value="11" data-select2-id="47">ARS CARIBALICO</option>
                            <option value="12" data-select2-id="48">ARS APS</option>
                            <option value="13" data-select2-id="49">ARS BIENESTAR</option>
                            <option value="14" data-select2-id="50">ARS SERVICIOS COOP. DE SALUD</option>
                            <option value="15" data-select2-id="51">META SEGUROS</option>
                            <option value="16" data-select2-id="52">ARS MULTI MAS</option>
                            <option value="17" data-select2-id="53">ARS MEDI SALUD S. A.</option>
                            <option value="18" data-select2-id="54">IMEGLO</option>
                            <option value="19" data-select2-id="55">ARS PALIC SALUD</option>
                            <option value="20" data-select2-id="56">PLAMEDIN</option>
                            <option value="21" data-select2-id="57">PLENA SALUD</option>
                            <option value="22" data-select2-id="58">ARS S.D.S</option>
                            <option value="23" data-select2-id="59">OSEPA</option>
                            <option value="24" data-select2-id="60">ARS SALUD TOTAL</option>
                            <option value="25" data-select2-id="61">SEDESAP</option>
                            <option value="26" data-select2-id="62">ARS MAXIMA SALUD</option>
                            <option value="27" data-select2-id="63">UNIPROSE</option>
                            <option value="28" data-select2-id="64">ARS YUNEN</option>
                            <option value="29" data-select2-id="65">ARS CENTRO ORIENTAL</option>
                            <option value="30" data-select2-id="66">ARS SIMERSA</option>
                            <option value="31" data-select2-id="67">SEGURO ADVENTISTA</option>
                            <option value="32" data-select2-id="68">ARS GALENO</option>
                            <option value="33" data-select2-id="69">ARS UCEMED</option>
                            <option value="34" data-select2-id="70">BONANZA</option>
                            <option value="35" data-select2-id="71">IMED</option>
                            <option value="36" data-select2-id="72">INTERCONTINENTAL</option>
                            <option value="37" data-select2-id="73">ISME</option>
                            <option value="38" data-select2-id="74">SEME UASD (EMPLEADOS)</option>
                            <option value="39" data-select2-id="75">SERVICIO MEDICO PREPAGADO (SMP</option>
                            <option value="40" data-select2-id="76">ARS UASD</option>
                            <option value="41" data-select2-id="77">ARS ADASS</option>
                            <option value="42" data-select2-id="78">ARS SALUD FAMILIAR</option>
                            <option value="43" data-select2-id="79">ARS D/S.M.H</option>
                            <option value="44" data-select2-id="80">COPICENTRO PROFESIONAL</option>
                            <option value="45" data-select2-id="81">SENASA</option>
                            <option value="46" data-select2-id="82">ARS SIMAG</option>
                            <option value="47" data-select2-id="83">ARS SALUD SEGURA</option>
                            <option value="48" data-select2-id="84">ARL SALUD SEGURA</option>
                            <option value="49" data-select2-id="85">ARS FUERZAS ARMADAS</option>
                            <option value="50" data-select2-id="86">ARS FUTURO</option>
                            <option value="51" data-select2-id="87">ARS SEMMA</option>
                            <option value="52" data-select2-id="88">CECANOR</option>
                            <option value="53" data-select2-id="89">ARS BMI COMPANY</option>
                            <option value="54" data-select2-id="90">LABORATORIO CLINICO DR. BIENVE</option>
                            <option value="55" data-select2-id="91">ARS ASEMAP</option>
                            <option value="56" data-select2-id="92">DOMINICAN HEALTH CARE / INVERS</option>
                            <option value="57" data-select2-id="93">ARS META SALUD</option>
                            <option value="58" data-select2-id="94">HUMANO SEGUROS</option>
                            <option value="59" data-select2-id="95">WORLDWIDE SEGUROS</option>
                            <option value="60" data-select2-id="96">GRUPO MEDICO ASOCIADO</option>
                            <option value="61" data-select2-id="97">BIOPSIA CON INMUNO HISTOQUIMICA</option>
                            <option value="62" data-select2-id="98">HISTEROSALPINGOGRAFIA</option>
                            <option value="63" data-select2-id="99">HISTEROSALPINGOGRAFIA</option>
                            <option value="64" data-select2-id="100">SONOGRAFIA MUSCOLOESQUELETICA</option>
                            <option value="65" data-select2-id="101">ARS C.M.D</option>
                            <option value="66" data-select2-id="102">ARS UNIVERSAL</option>
                            <option value="67" data-select2-id="103">ARS COLONIAL</option>
                            <option value="68" data-select2-id="104">ARS MONUMENTAL</option>
                            <option value="69" data-select2-id="105">ARS CONSTITUCION</option>
                            <option value="70" data-select2-id="106">ARS SEMUNASED</option>
                            <option value="71" data-select2-id="107">ARS RENACER</option>
                            <option value="72" data-select2-id="108">ARS RESERVAS INC.</option>
                            <option value="73" data-select2-id="109">ARS CARIBALICO</option>
                            <option value="74" data-select2-id="110">ARS APS</option>
                            <option value="75" data-select2-id="111">ARS BIENESTAR</option>
                            <option value="76" data-select2-id="112">ARS SERVICIOS COOP. DE SALUD</option>
                            <option value="77" data-select2-id="113">META SEGUROS</option>
                            <option value="78" data-select2-id="114">ARS MULTI MAS</option>
                            <option value="79" data-select2-id="115">ARS MEDI SALUD S. A.</option>
                            <option value="80" data-select2-id="116">IMEGLO</option>
                            <option value="81" data-select2-id="117">ARS PALIC SALUD</option>
                            <option value="82" data-select2-id="118">PLAMEDIN</option>
                            <option value="83" data-select2-id="119">PLENA SALUD</option>
                            <option value="84" data-select2-id="120">ARS S.D.S</option>
                            <option value="85" data-select2-id="121">OSEPA</option>
                            <option value="86" data-select2-id="122">ARS SALUD TOTAL</option>
                            <option value="87" data-select2-id="123">SEDESAP</option>
                            <option value="88" data-select2-id="124">ARS MAXIMA SALUD</option>
                            <option value="89" data-select2-id="125">UNIPROSE</option>
                            <option value="90" data-select2-id="126">ARS YUNEN</option>
                            <option value="91" data-select2-id="127">ARS CENTRO ORIENTAL</option>
                            <option value="92" data-select2-id="128">ARS SIMERSA</option>
                            <option value="93" data-select2-id="129">SEGURO ADVENTISTA</option>
                            <option value="94" data-select2-id="130">ARS GALENO</option>
                    </div>
                    <div class="form-group col-md-6">
                        <label for="">No. Afiliado</label>
                        <input type="text" name="Poliza" pattern="^[0-9]+$" class="form-control">
                    </div>
                    <div class="form-group col-md-6">
                        <label for="">Numero de Seguro Social (NSS)</label>
                        <input type="text" class="form-control" pattern="^[0-9]+$" name="NSS">
                    </div>
                </div>
                <br>

                <h5 style="margin-bottom: 0;">Datos demográficos</h5><br>
                <hr style="margin-top: 0;">

                <div class="form-row">
                    <div class="form-group col-md-12">
                        <label for="inputAddress">Dirección</label>
                        <input type="text" class="form-control" id="inputAddress" placeholder="1234 Main St" name="Direccion" data-bind="value: direccion" max="100">
                    </div>
                    <div class="form-group col-md-6">
                        <label for="">Ciudad</label>
                        <input type="text" class="form-control" placeholder="Nombre de la Ciudad" name="Ciudad">
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group col-md-6">
                        <label class="font-secondary">País </label>
                        <select class="form-control" id="selPaises" style="width: 100%;" tabindex="-1" aria-hidden="true" name="IdPais" required="">
                            <option value="" data-select2-id="2">- seleccionar pais -</option>
                            <option value="1" data-select2-id="163">República Dominicana</option>
                        </select>
                    </div>
                    <div class="form-group col-md-6">
                        <label class="font-secondary">Estado / provincia </label>
                        <select class="form-control" id="selProvincias" style="width: 100%;" tabindex="-1" aria-hidden="true" name="IdProvincia" required="">
                            <option value="" data-select2-id="4">- seleccionar estado o provincia -</option>
                            <option value="1" data-select2-id="5">Duarte</option>
                            <option value="2" data-select2-id="6">Azua</option>
                            <option value="3" data-select2-id="7">Bahoruco</option>
                            <option value="4" data-select2-id="8">Barahona</option>
                            <option value="5" data-select2-id="9">Dajabon</option>
                            <option value="6" data-select2-id="10">Distrito Nacional</option>
                            <option value="7" data-select2-id="11">El Seibo</option>
                    </div>
                </div>

                <div class="card-body d-flex justify-content-end align-items-center">
                    <button type="reset" class="btn btn-danger mr-2" data-bind="click: $root.limpiarFormulario">Limpiar</button>
                    <button type="submit" class="btn btn-success"><i class="mdi mdi-content-save-outline"></i>
                        Guardar paciente
                    </button>
                </div>
            </form>

        </div>
    </div>

</div>
<!--.card-body-->
</div>

</div>


</section>
</main>